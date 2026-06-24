// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

// Shared contract between the Electron main process (HTTP proxy to the local
// Python FastAPI "ai-engine" service) and the rest of the app. The renderer
// never talks to the network directly: it dispatches a synchronizable Redux
// action that the main process handles by calling the local service. Keep this
// file dependency-free so it can be imported from both main and common code.

// Local FastAPI service launched by `npm run ai-engine:dev` (see package.json).
// Can be overridden at runtime (e.g. when the engine is spawned on another port)
// via the THORIUM_AI_ENGINE_URL environment variable, read in the main process.
export const AI_ENGINE_BASE_URL = "http://127.0.0.1:8000";

/** Fast default model; works on CPU and modest GPUs. */
export const DEFAULT_AI_IMAGE_MODEL_ID = "stabilityai/sd-turbo";

/** Higher-quality, ungated model; lighter than FLUX.1-dev and a big step up from SD-Turbo. */
export const FLUX_SCHNELL_AI_IMAGE_MODEL_ID = "black-forest-labs/FLUX.1-schnell";

/** High-quality opt-in model; needs a CUDA GPU with enough VRAM and HF license acceptance. */
export const FLUX_AI_IMAGE_MODEL_ID = "black-forest-labs/FLUX.1-dev-FP8";

// A registered AI image model. `id` is the Hugging Face repo id passed to the
// engine; `label` is the user-facing display name. Built-in entries ship with
// the app; user-added entries are persisted in the settings Redux state and can
// be added / removed / set as default from the "AI models" settings tab.
export interface IAiImageModelEntry {
    id: string;
    label: string;
    /** Informational: gated repos require accepting a Hugging Face license. */
    gated?: boolean;
    /** True for the bundled defaults (kept distinct from user-added models). */
    builtin?: boolean;
}

// Download lifecycle of a model's weights in the local Hugging Face cache.
export type TAiImageModelDownloadState = "idle" | "downloading" | "downloaded" | "error";

export interface IAiImageModelDownloadStatus {
    state: TAiImageModelDownloadState;
    error?: string;
}

// Seed list used until the user customizes their registry. Kept in sync with the
// engine's supported model families (SD-Turbo, FLUX schnell, FLUX dev FP8).
export const BUILTIN_AI_IMAGE_MODELS: IAiImageModelEntry[] = [
    { id: DEFAULT_AI_IMAGE_MODEL_ID, label: "SD-Turbo (default, fast)", gated: false, builtin: true },
    { id: FLUX_SCHNELL_AI_IMAGE_MODEL_ID, label: "FLUX.1-schnell (high quality, GPU)", gated: false, builtin: true },
    { id: FLUX_AI_IMAGE_MODEL_ID, label: "FLUX.1-dev FP8 (best quality, GPU)", gated: true, builtin: true },
];

/** Loose validation that a string looks like a Hugging Face repo id (owner/name). */
export function isValidHfRepoId(modelId: string | undefined): modelId is string {
    return !!modelId && /^[\w.-]+\/[\w.-]+$/.test(modelId.trim());
}

export function isKnownAiImageModelId(modelId: string | undefined): modelId is string {
    return !!modelId && BUILTIN_AI_IMAGE_MODELS.some((option) => option.id === modelId);
}

export function resolveAiImageModelId(modelId: string | undefined): string {
    return isKnownAiImageModelId(modelId) ? modelId : DEFAULT_AI_IMAGE_MODEL_ID;
}

export interface IAiGenerateRequest {
    prompt: string;
    // Things to avoid in the image. Only effective on models that use
    // classifier-free guidance (e.g. FLUX.1-dev); ignored by SD-Turbo.
    negative_prompt?: string;
    model_id?: string;
    num_inference_steps?: number;
    seed?: number;
}

export interface IAiGenerateResponse {
    job_id: string;
    status: string;
    detail: string;
    model_id: string;
    device: string;
    // PNG image encoded as a base64 string (no data-URI prefix).
    image_base64: string;
}

export interface IAiDownloadRequest {
    model_id: string;
    revision?: string;
}

export interface IAiDownloadResponse {
    model_id: string;
    status: string;
    detail: string;
    cache_path?: string;
}

export interface IAiHealthResponse {
    status: string;
    service: string;
    device?: string;
}

// Uniform envelope returned by every proxied call so callers can distinguish
// transport/proxy failures from successful service responses.
export type TAiEngineProxyResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; status?: number };
