// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { Action } from "readium-desktop/common/models/redux";
import { ISettingsState } from "../../states/settings";

export const ID = "AI_IMAGE_MODEL_ID";

export function build(aiImageModelId: string):
    Action<typeof ID, Pick<ISettingsState, "aiImageModelId">> {

    return {
        type: ID,
        payload: {
            aiImageModelId,
        },
    };
}
build.toString = () => ID; // Redux StringableActionCreator
export type TAction = ReturnType<typeof build>;
