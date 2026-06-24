// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { TAiImageModelDownloadState } from "readium-desktop/common/ai/aiEngine";
import { Action } from "readium-desktop/common/models/redux";

// Main -> renderer: report a model's download/cache state so the settings UI
// can show progress. Transient (not persisted).
export const ID = "AI_IMAGE_MODEL_DOWNLOAD_STATUS";

export interface IPayload {
    modelId: string;
    state: TAiImageModelDownloadState;
    error?: string;
}

export function build(modelId: string, state: TAiImageModelDownloadState, error?: string): Action<typeof ID, IPayload> {
    return {
        type: ID,
        payload: { modelId, state, error },
    };
}
build.toString = () => ID;
export type TAction = ReturnType<typeof build>;
