// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { type Reducer } from "redux";

import { readerLocalActionAnnotations } from "../actions";
import { IAnnotationModeState } from "readium-desktop/common/redux/states/renderer/annotation";

function annotationModeEnableReducer_(
    state: IAnnotationModeState = { enable: false, locatorExtended: undefined, fromKeyboard: undefined },
    action: readerLocalActionAnnotations.enableMode.TAction | readerLocalActionAnnotations.setLocator.TAction,
): IAnnotationModeState {

    switch (action.type) {
        case readerLocalActionAnnotations.enableMode.ID:
            return {
                ...state,
                ...action.payload,
            };
        case readerLocalActionAnnotations.setLocator.ID:
            // Refreshing the selection only happens while the editor is open, so
            // the result is always the `enable: true` variant of the union.
            return {
                enable: true,
                locatorExtended: action.payload.locatorExtended,
                fromKeyboard: state.enable ? state.fromKeyboard : false,
            };
        default:
            return state;
    }
}

export const annotationModeEnableReducer = annotationModeEnableReducer_ as Reducer<ReturnType<typeof annotationModeEnableReducer_>>;
