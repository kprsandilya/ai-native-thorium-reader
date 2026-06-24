// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import debug_ from "debug";
import { Agent, fetch as undiciFetch } from "undici";
import {
    AI_ENGINE_BASE_URL,
    IAiGenerateRequest,
    IAiGenerateResponse,
    TAiEngineProxyResult,
} from "readium-desktop/common/ai/aiEngine";

// Logger
const debug = debug_("readium-desktop:main:aiEngineProxy");

// Image generation is a synchronous, potentially very long request: loading a
// diffusion pipeline and running inference (especially FLUX.1-dev with CPU
// offload on consumer GPUs) can take many minutes. Node's global fetch (undici)
// aborts such requests with a generic "fetch failed" once its default 300s
// headers/body timeout elapses. Use a dedicated dispatcher with those timeouts
// disabled so long generations complete instead of failing.
const aiEngineDispatcher = new Agent({
    headersTimeout: 0,
    bodyTimeout: 0,
    connect: { timeout: 30_000 },
});

interface IProxyInit {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
}

// Turn low-level undici transport failures (which all surface as the unhelpful
// "fetch failed") into actionable messages. The most common case for AI image
// generation is the engine process dying mid-request while loading a large
// model (e.g. FLUX), which the socket reports as ECONNRESET.
function describeProxyError(e: unknown): string {
    const err = e as { message?: string; cause?: { code?: string } };
    const code = err?.cause?.code;
    switch (code) {
        case "ECONNRESET":
        case "UND_ERR_SOCKET":
            return "The local AI engine stopped responding mid-request (connection reset). " +
                "This usually means the engine crashed or ran out of memory while loading the model. " +
                "For large models like FLUX, pre-download the weights (npm run ai-engine:download <model_id>) " +
                "and make sure there is enough GPU/RAM.";
        case "ECONNREFUSED":
            return "Could not reach the local AI engine (connection refused). " +
                "Is it running? Start it with: npm run ai-engine:dev";
        case "UND_ERR_CONNECT_TIMEOUT":
            return "Timed out connecting to the local AI engine. Is it running (npm run ai-engine:dev)?";
        default:
            return e instanceof Error ? e.message : String(e);
    }
}

// The renderer is never granted direct network access to the local Python
// "ai-engine" service. Instead it dispatches a Redux action that the main
// process handles by calling these helpers, which perform the actual fetch.
function baseUrl(): string {
    return process.env.THORIUM_AI_ENGINE_URL || AI_ENGINE_BASE_URL;
}

async function proxy<T>(
    path: string,
    init?: IProxyInit,
): Promise<TAiEngineProxyResult<T>> {

    const url = `${baseUrl()}${path}`;
    try {
        const res = await undiciFetch(url, {
            method: init?.method,
            body: init?.body,
            headers: {
                "Content-Type": "application/json",
                ...(init?.headers || {}),
            },
            dispatcher: aiEngineDispatcher,
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            debug("ai-engine proxy non-OK", res.status, text);
            return { ok: false, error: text || res.statusText, status: res.status };
        }

        const data = (await res.json()) as T;
        return { ok: true, data };
    } catch (e) {
        debug("ai-engine proxy error", url, e);
        return { ok: false, error: describeProxyError(e) };
    }
}

export async function aiEngineGenerate(
    request: IAiGenerateRequest,
): Promise<TAiEngineProxyResult<IAiGenerateResponse>> {

    return proxy<IAiGenerateResponse>("/generate", {
        method: "POST",
        body: JSON.stringify(request ?? {}),
    });
}

/** Drop cached diffusion pipelines so a model change frees GPU memory immediately. */
export async function aiEngineUnload(modelId?: string): Promise<TAiEngineProxyResult<{ status: string; detail: string }>> {

    return proxy<{ status: string; detail: string }>("/unload", {
        method: "POST",
        body: JSON.stringify(modelId ? { model_id: modelId } : {}),
    });
}
