// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { type Reducer } from "redux";

import { IAiImageDialogState } from "readium-desktop/common/redux/states/renderer/aiImageDialog";
import { readerLocalActionAnnotations } from "readium-desktop/renderer/reader/redux/actions";

const initialState: IAiImageDialogState = {
    open: false,
    draft: undefined,
};

function aiImageDialogReducer_(
    state: IAiImageDialogState = initialState,
    action:
        readerLocalActionAnnotations.aiImageDialogOpen.TAction |
        readerLocalActionAnnotations.aiImageDialogClose.TAction |
        readerLocalActionAnnotations.generateImageForSelection.TAction,
): IAiImageDialogState {
    switch (action.type) {
        case readerLocalActionAnnotations.aiImageDialogOpen.ID:
            return {
                open: true,
                draft: action.payload.draft,
            };
        case readerLocalActionAnnotations.aiImageDialogClose.ID:
        case readerLocalActionAnnotations.generateImageForSelection.ID:
            return {
                open: false,
                draft: undefined,
            };
        default:
            return state;
    }
}

export const aiImageDialogReducer = aiImageDialogReducer_ as Reducer<ReturnType<typeof aiImageDialogReducer_>>;
