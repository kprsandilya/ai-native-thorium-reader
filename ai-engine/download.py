"""Pre-fetch model weights into the local Hugging Face cache.

Run this once while online so the engine can later generate images fully
offline (set THORIUM_AI_OFFLINE=1 at runtime). Usage:

    uv run python download.py [model_id]

Defaults to the same model the engine uses (THORIUM_AI_MODEL_ID or sd-turbo).
"""

from __future__ import annotations

import os
import sys

DEFAULT_MODEL_ID = os.environ.get("THORIUM_AI_MODEL_ID", "stabilityai/sd-turbo")

# When a FLUX model ships as a single-file (FP8) transformer checkpoint it still
# needs the text encoders / VAE / scheduler from the base diffusers repo. Keep
# this in sync with FLUX_BASE_MODEL_ID in main.py.
FLUX_BASE_MODEL_ID = os.environ.get("THORIUM_AI_FLUX_BASE_ID", "black-forest-labs/FLUX.1-dev")


def _gated_hint(model_id: str) -> None:
    print(
        f"\nERROR: '{model_id}' is a GATED repository and your account hasn't been\n"
        f"granted access yet. Being logged in is not enough.\n\n"
        f"  1. Open https://huggingface.co/{model_id} while logged in and accept the\n"
        f"     license / conditions (click 'Agree'). Approval is usually instant.\n"
        f"  2. For FLUX FP8 single-file repos, also accept the base repo gate\n"
        f"     (e.g. https://huggingface.co/{FLUX_BASE_MODEL_ID}).\n"
        f"  3. Re-run this command.\n\n"
        f"Tip: 'black-forest-labs/FLUX.1-schnell' is NOT gated if you'd rather skip this.\n",
        file=sys.stderr,
    )


def _download(model_id: str) -> str:
    from huggingface_hub import snapshot_download
    from huggingface_hub.errors import GatedRepoError

    print(f"Downloading {model_id} into the local Hugging Face cache...")
    try:
        return snapshot_download(repo_id=model_id)
    except GatedRepoError:
        _gated_hint(model_id)
        sys.exit(1)


def _is_single_file_flux(path: str) -> bool:
    """A FLUX repo with no model_index.json is a single-file checkpoint and
    therefore needs the base diffusers repo for its text encoders / VAE."""

    return not os.path.exists(os.path.join(path, "model_index.json"))


def main() -> None:
    model_id = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_MODEL_ID

    path = _download(model_id)

    if "flux" in model_id.lower() and _is_single_file_flux(path):
        print(
            f"\n{model_id} is a single-file FLUX checkpoint; also fetching the base "
            f"components ({FLUX_BASE_MODEL_ID}) it needs to run...",
        )
        _download(FLUX_BASE_MODEL_ID)

    print(f"Done. Cached at: {path}")
    print("You can now run the engine offline with THORIUM_AI_OFFLINE=1.")


if __name__ == "__main__":
    main()
