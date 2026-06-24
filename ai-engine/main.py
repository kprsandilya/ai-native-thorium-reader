"""AI engine background service for Thorium Reader.

A lightweight FastAPI service that the Electron app talks to (via a secure
IPC HTTP proxy in the main process) for local, offline image generation and
model management. Generation is backed by `diffusers` and runs on whatever
hardware is available (CUDA GPU, Apple MPS, or CPU fallback).
"""

from __future__ import annotations

import base64
import io
import os
import threading
import uuid
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Offline mode. When THORIUM_AI_OFFLINE is truthy, force huggingface_hub /
# transformers to never hit the network: weights must already be in the local
# cache (see the /download endpoint or `npm run ai-engine:download`). These must
# be set BEFORE diffusers / huggingface_hub are imported, which is why they're
# applied at module load (the heavy imports are lazy, inside the handlers).
if os.environ.get("THORIUM_AI_OFFLINE", "").lower() in ("1", "true", "yes"):
    os.environ.setdefault("HF_HUB_OFFLINE", "1")
    os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

# Default model. SD-Turbo is fast, ungated, and runs on CPU or modest GPUs.
# FLUX.1-dev (FP8) is opt-in via the Thorium settings UI or per-request `model_id`;
# it is GATED on Hugging Face and needs plenty of VRAM (NVIDIA GPU recommended).
# Override globally via THORIUM_AI_MODEL_ID for development / packaging.
DEFAULT_MODEL_ID = os.environ.get("THORIUM_AI_MODEL_ID", "stabilityai/sd-turbo")

# Reduce VRAM by offloading model components to CPU between steps (recommended
# for big models like FLUX on consumer GPUs). Disable with THORIUM_AI_CPU_OFFLOAD=0.
CPU_OFFLOAD = os.environ.get("THORIUM_AI_CPU_OFFLOAD", "1").lower() not in ("0", "false", "no")

app = FastAPI(
    title="Thorium AI Engine",
    description="Local AI image generation and model-management service for Thorium Reader.",
    version="0.1.0",
)

# During development the Electron renderer / main process talks to this
# service on localhost. Lock this down further once the IPC proxy is final.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    prompt: str = Field(..., description="Text prompt to condition generation on.")
    negative_prompt: Optional[str] = Field(
        default=None,
        description=(
            "Things to avoid in the image. Only takes effect on models that use "
            "classifier-free guidance (guidance_scale > 1, e.g. FLUX.1-dev); "
            "distilled few-step models like SD-Turbo run at guidance 0 and ignore it."
        ),
    )
    model_id: Optional[str] = Field(
        default=None,
        description="Hugging Face model id to use; defaults to the configured model.",
    )
    num_inference_steps: Optional[int] = Field(default=None, ge=1, le=200)
    guidance_scale: Optional[float] = Field(default=None, ge=0.0, le=30.0)
    seed: Optional[int] = Field(default=None, description="Optional RNG seed.")


class GenerateResponse(BaseModel):
    job_id: str
    status: str
    detail: str
    model_id: str
    device: str
    # PNG image encoded as a base64 string (no data-URI prefix).
    image_base64: str


class DownloadRequest(BaseModel):
    model_id: str = Field(..., description="Hugging Face repo id, e.g. 'stabilityai/sd-turbo'.")
    revision: Optional[str] = Field(default=None, description="Optional git revision / branch / tag.")


class DownloadResponse(BaseModel):
    model_id: str
    status: str
    detail: str
    cache_path: Optional[str] = None


class UnloadRequest(BaseModel):
    model_id: Optional[str] = Field(
        default=None,
        description="Unload a specific cached model; omit to unload all cached pipelines.",
    )


class UnloadResponse(BaseModel):
    status: str
    detail: str


# ---------------------------------------------------------------------------
# Device + pipeline management
# ---------------------------------------------------------------------------

# A single cached pipeline per model id. Loading a diffusion pipeline is
# expensive, so we keep it resident and guard (de)hydration with a lock so
# concurrent requests don't each trigger a load.
_pipeline_lock = threading.Lock()
_pipeline_cache: dict[str, object] = {}
_resolved_device: Optional[str] = None
_resolved_dtype = None


def _resolve_device() -> str:
    """Pick the best available backend: CUDA GPU, Apple MPS, then CPU."""

    global _resolved_device, _resolved_dtype
    if _resolved_device is not None:
        return _resolved_device

    import torch

    if torch.cuda.is_available():
        _resolved_device = "cuda"
        _resolved_dtype = torch.float16
    elif getattr(torch.backends, "mps", None) is not None and torch.backends.mps.is_available():
        _resolved_device = "mps"
        # float16 on MPS is brittle for some ops; float32 is the safe default.
        _resolved_dtype = torch.float32
    else:
        _resolved_device = "cpu"
        _resolved_dtype = torch.float32

    return _resolved_device


def _is_flux(model_id: str) -> bool:
    return "flux" in model_id.lower()


# Base diffusers repo that supplies the text encoders / VAE / scheduler when a
# FLUX model is distributed as a single-file (FP8) transformer checkpoint.
# Override with THORIUM_AI_FLUX_BASE_ID (e.g. to point at a local mirror).
FLUX_BASE_MODEL_ID = os.environ.get("THORIUM_AI_FLUX_BASE_ID", "black-forest-labs/FLUX.1-dev")


class WeightsNotDownloadedError(RuntimeError):
    """Raised when a model's weights aren't in the local cache yet.

    Generation deliberately never downloads multi-gigabyte weights on the fly:
    doing so inside a /generate request makes the call appear to hang and can
    crash the engine mid-download (which surfaces to the app as a generic
    "fetch failed" / connection reset). Pre-fetch with `npm run
    ai-engine:download <model_id>` instead.
    """


def _finalize_flux(pipeline, device: str):
    """Place a loaded FLUX pipeline on the right device / offload strategy."""

    if device == "cuda" and CPU_OFFLOAD:
        # Keep most of the 12B model on CPU and stream layers to the GPU as
        # needed: fits much smaller cards (e.g. 8 GB laptops) at the cost of speed.
        pipeline.enable_model_cpu_offload()
    else:
        pipeline = pipeline.to(device)
    return pipeline


def _maybe_quantize_fp8(module) -> bool:
    """Quantize a module to fp8 with optimum-quanto when available.

    Recommended for FLUX on consumer GPUs: keeps the transformer near its fp8
    size (~12 GB) instead of dequantizing to bf16 (~24 GB). No-op (returns
    False) when optimum-quanto isn't installed.
    """

    try:
        from optimum.quanto import freeze, qfloat8, quantize
    except Exception:
        return False

    quantize(module, weights=qfloat8)
    freeze(module)
    return True


def _require_cached_file(model_id: str, filename: str) -> str:
    """Resolve a repo file from the local cache, or fail with guidance.

    Never downloads: if the file isn't cached we raise so the caller can tell
    the user to pre-fetch the weights instead of silently pulling gigabytes
    during a generation request.
    """

    from huggingface_hub import hf_hub_download

    try:
        return hf_hub_download(model_id, filename, local_files_only=True)
    except Exception as e:
        raise WeightsNotDownloadedError(
            f"FLUX weights for {model_id!r} ('{filename}') are not downloaded yet. "
            f"Pre-fetch them first (this is a large, one-time download): "
            f"`npm run ai-engine:download {model_id}`."
        ) from e


def _list_repo_files(model_id: str) -> list[str]:
    """List the files in a repo. Raises actionable guidance when the listing
    can't be resolved (e.g. offline with no cached snapshot)."""

    from huggingface_hub import list_repo_files

    try:
        return list_repo_files(model_id)
    except Exception as e:
        raise WeightsNotDownloadedError(
            f"Could not resolve files for {model_id!r} ({e}). Pre-fetch the model "
            f"first: `npm run ai-engine:download {model_id}`."
        ) from e


def _load_flux_pipeline(model_id: str, device: str):
    """Load a FLUX pipeline, handling both diffusers-format and single-file
    (e.g. FP8) repositories.

    Diffusers-layout repos (e.g. FLUX.1-schnell, FLUX.1-dev) load directly.
    Single-file FP8 repos ship only the transformer checkpoint, so the text
    encoders / VAE / scheduler are taken from the base FLUX.1-dev diffusers repo
    (FLUX_BASE_MODEL_ID) and the fp8 transformer is swapped in.

    In all cases weights must already be cached locally: generation never pulls
    multi-gigabyte weights on the fly (that can hang the request and crash the
    engine mid-download). Missing weights raise WeightsNotDownloadedError.
    """

    import torch
    from diffusers import FluxPipeline

    # FLUX runs in bfloat16.
    dtype = torch.bfloat16

    # Diffusers layout (repo has model_index.json), loaded from the local cache
    # only. We never download here.
    pipeline = None
    try:
        pipeline = FluxPipeline.from_pretrained(
            model_id, torch_dtype=dtype, local_files_only=True,
        )
    except Exception:
        pipeline = None
    if pipeline is not None:
        return _finalize_flux(pipeline, device)

    # Not cached as a diffusers pipeline. Decide whether it's a diffusers-layout
    # repo that simply isn't downloaded yet, or a single-file checkpoint repo.
    files = _list_repo_files(model_id)
    if "model_index.json" in files:
        raise WeightsNotDownloadedError(
            f"FLUX weights for {model_id!r} are not downloaded yet. Pre-fetch them "
            f"first (large, one-time download): `npm run ai-engine:download {model_id}`."
        )

    # Single-file (FP8 / ComfyUI-style) checkpoint path.
    from diffusers import FluxTransformer2DModel

    safetensors = [f for f in files if f.endswith(".safetensors")]
    if not safetensors:
        raise RuntimeError(
            f"{model_id!r} is neither a diffusers FLUX pipeline nor a single-file "
            f"checkpoint repo (no .safetensors found); cannot load it as FLUX."
        )
    # Prefer a file that looks like the main FLUX transformer checkpoint.
    ckpt = next((f for f in safetensors if "flux" in f.lower()), safetensors[0])
    ckpt_path = _require_cached_file(model_id, ckpt)

    transformer = FluxTransformer2DModel.from_single_file(ckpt_path, torch_dtype=dtype)
    _maybe_quantize_fp8(transformer)

    try:
        pipeline = FluxPipeline.from_pretrained(
            FLUX_BASE_MODEL_ID,
            transformer=transformer,
            torch_dtype=dtype,
            local_files_only=True,
        )
    except Exception as e:
        raise WeightsNotDownloadedError(
            f"The FLUX base components ({FLUX_BASE_MODEL_ID}: text encoders, VAE) "
            f"needed to run {model_id!r} are not fully downloaded ({e}). Pre-fetch "
            f"them with: `npm run ai-engine:download {FLUX_BASE_MODEL_ID}`."
        ) from e

    return _finalize_flux(pipeline, device)


def _unload_pipelines(model_id: Optional[str] = None) -> None:
    """Release cached pipeline(s) and return GPU/RAM to the OS."""

    import gc

    if model_id is None:
        _pipeline_cache.clear()
    else:
        _pipeline_cache.pop(model_id, None)

    gc.collect()
    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        elif getattr(torch.backends, "mps", None) is not None and torch.backends.mps.is_available():
            torch.mps.empty_cache()
    except Exception:
        pass


def _get_pipeline(model_id: str):
    """Lazily load and cache a diffusion pipeline for `model_id`."""

    cached = _pipeline_cache.get(model_id)
    if cached is not None:
        return cached

    with _pipeline_lock:
        cached = _pipeline_cache.get(model_id)
        if cached is not None:
            return cached

        # Keep a single model resident so hot-swapping frees VRAM on 8 GB GPUs.
        if _pipeline_cache:
            _unload_pipelines()

        device = _resolve_device()

        if _is_flux(model_id):
            pipeline = _load_flux_pipeline(model_id, device)
        else:
            from diffusers import AutoPipelineForText2Image

            pipeline = AutoPipelineForText2Image.from_pretrained(
                model_id,
                torch_dtype=_resolved_dtype,
            )
            pipeline = pipeline.to(device)

        # Trim memory pressure on constrained machines.
        try:
            pipeline.set_progress_bar_config(disable=True)
        except Exception:
            pass

        _pipeline_cache[model_id] = pipeline
        return pipeline


def _generation_params(model_id: str, request: "GenerateRequest") -> tuple[int, float]:
    """Pick sensible per-model defaults when the request doesn't specify them.

    FLUX.1-dev needs real guidance and ~28 steps; FLUX.1-schnell and SD-Turbo are
    distilled few-step models that use guidance_scale=0.0.
    """

    mid = model_id.lower()
    if _is_flux(mid):
        if "schnell" in mid:
            steps = request.num_inference_steps or 4
            guidance = request.guidance_scale if request.guidance_scale is not None else 0.0
        else:  # FLUX.1-dev
            steps = request.num_inference_steps or 28
            guidance = request.guidance_scale if request.guidance_scale is not None else 3.5
        return steps, guidance

    # SD-Turbo / SDXL-Turbo and other distilled few-step models.
    steps = request.num_inference_steps or 1
    guidance = request.guidance_scale if request.guidance_scale is not None else 0.0
    return steps, guidance


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe used by the Electron launcher."""

    # Resolve device lazily; if torch isn't importable yet, still report ok so
    # the launcher knows the HTTP server is up.
    device = "unknown"
    try:
        device = _resolve_device()
    except Exception:
        pass
    return {"status": "ok", "service": "thorium-ai-engine", "device": device}


@app.post("/generate", response_model=GenerateResponse)
def generate(request: GenerateRequest) -> GenerateResponse:
    """Generate an image from `request.prompt` and return it as base64 PNG."""

    model_id = request.model_id or DEFAULT_MODEL_ID

    try:
        import torch

        pipeline = _get_pipeline(model_id)
        device = _resolve_device()

        generator = None
        if request.seed is not None:
            # MPS doesn't support a device-bound generator for all ops; use CPU
            # generator which is portable across backends.
            generator = torch.Generator(device="cpu").manual_seed(request.seed)

        steps, guidance = _generation_params(model_id, request)

        call_kwargs = dict(
            prompt=request.prompt,
            num_inference_steps=steps,
            guidance_scale=guidance,
            generator=generator,
        )

        # Negative prompts only matter when classifier-free guidance is active.
        # SD-Turbo & friends run at guidance 0, so the negative is a no-op there.
        negative = (request.negative_prompt or "").strip()
        if negative:
            call_kwargs["negative_prompt"] = negative
            if _is_flux(model_id):
                # FLUX needs "true" CFG turned on for a negative prompt to apply.
                call_kwargs["true_cfg_scale"] = 2.0

        try:
            result = pipeline(**call_kwargs)
        except TypeError:
            # Pipeline doesn't accept negative_prompt / true_cfg_scale: retry plain.
            call_kwargs.pop("negative_prompt", None)
            call_kwargs.pop("true_cfg_scale", None)
            result = pipeline(**call_kwargs)
        image = result.images[0]

        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        image_base64 = base64.b64encode(buffer.getvalue()).decode("ascii")

    except WeightsNotDownloadedError as e:
        # Actionable, expected condition (weights not pre-fetched): return the
        # guidance verbatim so the app can show it directly.
        raise HTTPException(status_code=409, detail=str(e)) from e
    except Exception as e:  # noqa: BLE001 - surface any inference error to the caller
        raise HTTPException(
            status_code=500,
            detail=f"Image generation failed for model {model_id!r}: {e}",
        ) from e

    return GenerateResponse(
        job_id=str(uuid.uuid4()),
        status="completed",
        detail=f"Generated image from prompt using model {model_id}.",
        model_id=model_id,
        device=device,
        image_base64=image_base64,
    )


@app.post("/unload", response_model=UnloadResponse)
def unload(request: UnloadRequest = UnloadRequest()) -> UnloadResponse:
    """Drop cached pipeline weights so switching models frees GPU memory."""

    with _pipeline_lock:
        if request.model_id:
            _unload_pipelines(request.model_id)
            detail = f"Unloaded cached pipeline for {request.model_id!r}."
        else:
            _unload_pipelines()
            detail = "Unloaded all cached pipelines."

    return UnloadResponse(status="ok", detail=detail)


@app.post("/download", response_model=DownloadResponse)
def download(request: DownloadRequest) -> DownloadResponse:
    """Pre-fetch model weights so generation can later run fully offline."""

    try:
        from huggingface_hub import snapshot_download

        cache_path = snapshot_download(
            repo_id=request.model_id,
            revision=request.revision,
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download {request.model_id!r}: {e}",
        ) from e

    return DownloadResponse(
        model_id=request.model_id,
        status="completed",
        detail=(
            f"Downloaded {request.model_id} "
            f"(revision {request.revision or 'main'}) into the local cache."
        ),
        cache_path=cache_path,
    )


def main() -> None:
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    main()
