// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { IAiImageModelEntry } from "readium-desktop/common/ai/aiEngine";
import { Action } from "readium-desktop/common/models/redux";

export const ID = "AI_IMAGE_MODELS_SET";

export interface IPayload {
    aiImageModels: IAiImageModelEntry[];
}

export function build(aiImageModels: IAiImageModelEntry[]): Action<typeof ID, IPayload> {
    return {
        type: ID,
        payload: { aiImageModels },
    };
}
build.toString = () => ID; // Redux StringableActionCreator
export type TAction = ReturnType<typeof build>;
