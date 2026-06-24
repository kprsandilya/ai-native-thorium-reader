// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { IColor } from "@r2-navigator-js/electron/common/highlight";
import { MiniLocatorExtended } from "readium-desktop/common/redux/states/locatorInitialState";
import { TDrawType } from "readium-desktop/common/redux/states/renderer/note";

// Draft carried from the annotation popover into the larger "generate image"
// dialog so the dialog can re-create the same annotation (and attach the image)
// after the popover has closed.
export interface IAiImageDraft {
    color: IColor;
    drawType: TDrawType;
    tags: string[];
    comment: string;
    // Default prompt shown in the dialog (typically the highlighted text).
    prompt: string;
    locatorExtended?: MiniLocatorExtended;
}

export interface IAiImageDialogState {
    open: boolean;
    draft?: IAiImageDraft;
}
