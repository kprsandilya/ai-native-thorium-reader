// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { Action } from "readium-desktop/common/models/redux";

export const ID = "READER_ANNOTATIONS_AI_IMAGE_DIALOG_CLOSE";

// Close the "generate image" dialog without generating.
export function build(): Action<typeof ID> {
    return {
        type: ID,
        payload: {},
    };
}
build.toString = () => ID;
export type TAction = ReturnType<typeof build>;
