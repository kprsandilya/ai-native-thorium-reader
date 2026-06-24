// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { Action } from "readium-desktop/common/models/redux";
import { IAiImageDraft } from "readium-desktop/common/redux/states/renderer/aiImageDialog";

export const ID = "READER_ANNOTATIONS_AI_IMAGE_DIALOG_OPEN";

interface IPayload {
    draft: IAiImageDraft;
}

// Open the larger "generate image" dialog with the in-progress annotation draft
// (dispatched by the annotation popover's "Generate image" button).
export function build(draft: IAiImageDraft): Action<typeof ID, IPayload> {
    return {
        type: ID,
        payload: { draft },
    };
}
build.toString = () => ID;
export type TAction = ReturnType<typeof build>;
