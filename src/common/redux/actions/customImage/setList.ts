// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { Action } from "readium-desktop/common/models/redux";
import { ICustomImageRecord } from "readium-desktop/common/redux/states/renderer/customImage";

export const ID = "CUSTOM_IMAGE_SET_LIST";

export interface IPayload {
    images: ICustomImageRecord[];
}

// Main -> renderer: replace the whole list (used to hydrate the library window
// from the persisted main state).
export function build(images: ICustomImageRecord[]): Action<typeof ID, IPayload> {
    return {
        type: ID,
        payload: { images },
    };
}
build.toString = () => ID;
export type TAction = ReturnType<typeof build>;
