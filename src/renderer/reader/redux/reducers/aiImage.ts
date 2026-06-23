// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { type Reducer } from "redux";

import { readerActions } from "readium-desktop/common/redux/actions";
import { IAiImageState } from "readium-desktop/common/redux/states/renderer/aiImage";

function aiImageReducer_(
    state: IAiImageState = {},
    action: readerActions.aiImage.request.TAction | readerActions.aiImage.status.TAction,
): IAiImageState {

    switch (action.type) {
        case readerActions.aiImage.request.ID:
            return {
                ...state,
                [action.payload.note.uuid]: { status: "pending" },
            };
        case readerActions.aiImage.status.ID:
            return {
                ...state,
                [action.payload.noteUuid]: {
                    status: action.payload.status,
                    error: action.payload.error,
                },
            };
        default:
            return state;
    }
}

export const aiImageReducer = aiImageReducer_ as Reducer<ReturnType<typeof aiImageReducer_>>;
