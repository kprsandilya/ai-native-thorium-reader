// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { Action } from "readium-desktop/common/models/redux";
import { ICustomImageRecord } from "readium-desktop/common/redux/states/renderer/customImage";

export const ID = "CUSTOM_IMAGE_ADD";

export interface IPayload {
    image: ICustomImageRecord;
}

export function build(image: ICustomImageRecord): Action<typeof ID, IPayload> {
    return {
        type: ID,
        payload: { image },
    };
}
build.toString = () => ID;
export type TAction = ReturnType<typeof build>;
