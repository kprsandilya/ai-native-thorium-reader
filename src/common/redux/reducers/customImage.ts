// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { type Reducer } from "redux";

import { customImageActions } from "readium-desktop/common/redux/actions";
import { ICustomImageState } from "readium-desktop/common/redux/states/renderer/customImage";

const initialState: ICustomImageState = {
    list: [],
    status: {},
};

function customImageReducer_(
    state: ICustomImageState = initialState,
    action:
        customImageActions.generateRequest.TAction |
        customImageActions.status.TAction |
        customImageActions.add.TAction |
        customImageActions.remove.TAction |
        customImageActions.setList.TAction,
): ICustomImageState {
    switch (action.type) {
        case customImageActions.generateRequest.ID:
            return {
                ...state,
                status: { ...state.status, [action.payload.uuid]: { status: "pending" } },
            };
        case customImageActions.status.ID:
            return {
                ...state,
                status: {
                    ...state.status,
                    [action.payload.uuid]: { status: action.payload.status, error: action.payload.error },
                },
            };
        case customImageActions.add.ID: {
            const image = action.payload.image;
            const list = [image, ...state.list.filter((i) => i.uuid !== image.uuid)];
            return {
                list,
                status: { ...state.status, [image.uuid]: { status: "success" } },
            };
        }
        case customImageActions.remove.ID: {
            const { [action.payload.uuid]: _removed, ...status } = state.status;
            return {
                list: state.list.filter((i) => i.uuid !== action.payload.uuid),
                status,
            };
        }
        case customImageActions.setList.ID:
            return {
                ...state,
                list: action.payload.images,
            };
        default:
            return state;
    }
}

export const customImageReducer = customImageReducer_ as Reducer<ReturnType<typeof customImageReducer_>>;
