// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { Action } from "readium-desktop/common/models/redux";

export const ID = "CUSTOM_IMAGE_GENERATE_REQUEST";

export interface IPayload {
    uuid: string;
    // Final prompt (already combined with any chosen art style).
    prompt: string;
    negativePrompt?: string;
    styleId?: string;
    // Optional model override; defaults to the configured AI image model.
    modelId?: string;
}

export function build(payload: IPayload): Action<typeof ID, IPayload> {
    return {
        type: ID,
        payload,
    };
}
build.toString = () => ID;
export type TAction = ReturnType<typeof build>;
