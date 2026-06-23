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

/** High-quality opt-in model; needs a CUDA GPU with enough VRAM and HF license acceptance. */
export const FLUX_AI_IMAGE_MODEL_ID = "black-forest-labs/FLUX.1-dev-FP8";

export interface IAiImageModelOption {
    id: string;
    /** Stable key used to look up a localized label in settings. */
    labelKey: "settings.aiImage.model.sdTurbo" | "settings.aiImage.model.fluxDevFp8";
}

export const AI_IMAGE_MODEL_OPTIONS: IAiImageModelOption[] = [
    { id: DEFAULT_AI_IMAGE_MODEL_ID, labelKey: "settings.aiImage.model.sdTurbo" },
    { id: FLUX_AI_IMAGE_MODEL_ID, labelKey: "settings.aiImage.model.fluxDevFp8" },
];

export function isKnownAiImageModelId(modelId: string | undefined): modelId is string {
    return !!modelId && AI_IMAGE_MODEL_OPTIONS.some((option) => option.id === modelId);
}

export function resolveAiImageModelId(modelId: string | undefined): string {
    return isKnownAiImageModelId(modelId) ? modelId : DEFAULT_AI_IMAGE_MODEL_ID;
}

export interface IAiGenerateRequest {
    prompt: string;
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
