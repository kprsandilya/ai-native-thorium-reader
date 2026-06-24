// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { type Reducer } from "redux";

import { ISettingsState } from "readium-desktop/common/redux/states/settings";
import { settingsActions } from "readium-desktop/common/redux/actions";
import { BUILTIN_AI_IMAGE_MODELS, DEFAULT_AI_IMAGE_MODEL_ID } from "readium-desktop/common/ai/aiEngine";

const initialState: ISettingsState = {
    enableAPIAPP: false,
    minimizeLibraryToTray: false,
    lcpAutoDeleteExpiredPublications: false,
    lcpAutoDeleteExpiredPublicationsForced: false,
    aiImageModelId: DEFAULT_AI_IMAGE_MODEL_ID,
    aiImageModels: BUILTIN_AI_IMAGE_MODELS,
    aiImageModelDownload: {},
};

function settingsReducer_(
    state: ISettingsState = initialState,
    action:
        settingsActions.aiImageModelId.TAction |
        settingsActions.aiImageModels.TAction |
        settingsActions.aiImageModelDownloadRequest.TAction |
        settingsActions.aiImageModelDownloadStatus.TAction |
        settingsActions.aiImageModelStatusRefresh.TAction |
        settingsActions.enableAPIAPP.TAction |
        settingsActions.minimizeLibraryToTray.TAction |
        settingsActions.lcpAutoDeleteExpiredPublications.TAction |
        settingsActions.lcpAutoDeleteExpiredPublicationsForced.TAction,
):  ISettingsState {
    switch (action.type) {
        case settingsActions.aiImageModelId.ID:
            return {
                ...initialState,
                ...state,
                aiImageModelId: action.payload.aiImageModelId,
            };
        case settingsActions.aiImageModels.ID:
            return {
                ...initialState,
                ...state,
                aiImageModels: action.payload.aiImageModels,
            };
        case settingsActions.aiImageModelDownloadRequest.ID:
            return {
                ...initialState,
                ...state,
                aiImageModelDownload: {
                    ...state.aiImageModelDownload,
                    [action.payload.modelId]: { state: "downloading" },
                },
            };
        case settingsActions.aiImageModelDownloadStatus.ID:
            return {
                ...initialState,
                ...state,
                aiImageModelDownload: {
                    ...state.aiImageModelDownload,
                    [action.payload.modelId]: { state: action.payload.state, error: action.payload.error },
                },
            };
        case settingsActions.enableAPIAPP.ID:
            return {
                ...initialState,
                ...state,
                enableAPIAPP: action.payload.enableAPIAPP,
            };
        case settingsActions.minimizeLibraryToTray.ID:
            return {
                ...initialState,
                ...state,
                minimizeLibraryToTray: action.payload.minimizeLibraryToTray,
            };
        case settingsActions.lcpAutoDeleteExpiredPublications.ID:
            return {
                ...initialState,
                ...state,
                lcpAutoDeleteExpiredPublications: action.payload.lcpAutoDeleteExpiredPublications,
            };
        case settingsActions.lcpAutoDeleteExpiredPublicationsForced.ID:
            return {
                ...initialState,
                ...state,
                lcpAutoDeleteExpiredPublicationsForced: action.payload.lcpAutoDeleteExpiredPublicationsForced,
            };

        default:
            return state;
    }
}

export const settingsReducer = settingsReducer_ as Reducer<ReturnType<typeof settingsReducer_>>;
