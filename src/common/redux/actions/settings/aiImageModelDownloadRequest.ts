// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { Action } from "readium-desktop/common/models/redux";

// Renderer -> main: ask the engine to pre-fetch a model's weights into the
// local Hugging Face cache. Handled by the main "manageModels" saga.
export const ID = "AI_IMAGE_MODEL_DOWNLOAD_REQUEST";

export interface IPayload {
    modelId: string;
}

export function build(modelId: string): Action<typeof ID, IPayload> {
    return {
        type: ID,
        payload: { modelId },
    };
}
build.toString = () => ID;
export type TAction = ReturnType<typeof build>;
