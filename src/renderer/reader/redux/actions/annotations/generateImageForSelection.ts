// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { IColor } from "@r2-navigator-js/electron/common/highlight";
import { Action } from "readium-desktop/common/models/redux";
import { MiniLocatorExtended } from "readium-desktop/common/redux/states/locatorInitialState";
import { TDrawType } from "readium-desktop/common/redux/states/renderer/note";

export const ID = "READER_ANNOTATIONS_GENERATE_IMAGE_FOR_SELECTION";

interface IPayload {
    locatorExtended: MiniLocatorExtended;
    color: IColor;
    drawType: TDrawType;
    tags: string[];
    comment: string;
    // Final prompt (already combined with the chosen art style).
    prompt: string;
    negativePrompt?: string;
}

// Confirmed from the "generate image" dialog: create the annotation for the
// captured selection and request an AI image with the given prompt/style/negative.
export function build(
    locatorExtended: MiniLocatorExtended,
    color: IColor,
    drawType: TDrawType,
    tags: string[],
    comment: string,
    prompt: string,
    negativePrompt?: string,
): Action<typeof ID, IPayload> {
    return {
        type: ID,
        payload: { locatorExtended, color, drawType, tags, comment, prompt, negativePrompt },
    };
}
build.toString = () => ID;
export type TAction = ReturnType<typeof build>;
