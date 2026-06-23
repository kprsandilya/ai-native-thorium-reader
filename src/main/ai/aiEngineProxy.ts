// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import debug_ from "debug";
import {
    AI_ENGINE_BASE_URL,
    IAiGenerateRequest,
    IAiGenerateResponse,
    TAiEngineProxyResult,
} from "readium-desktop/common/ai/aiEngine";

// Logger
const debug = debug_("readium-desktop:main:aiEngineProxy");

// The renderer is never granted direct network access to the local Python
// "ai-engine" service. Instead it dispatches a Redux action that the main
// process handles by calling these helpers, which perform the actual fetch.
function baseUrl(): string {
    return process.env.THORIUM_AI_ENGINE_URL || AI_ENGINE_BASE_URL;
}

async function proxy<T>(
    path: string,
    init?: RequestInit,
): Promise<TAiEngineProxyResult<T>> {

    const url = `${baseUrl()}${path}`;
    try {
        const res = await fetch(url, {
            ...init,
            headers: {
                "Content-Type": "application/json",
                ...(init?.headers || {}),
            },
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
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
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
