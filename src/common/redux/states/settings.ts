// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { DEFAULT_AI_IMAGE_MODEL_ID, resolveAiImageModelId } from "readium-desktop/common/ai/aiEngine";

export interface ISettingsState {
    enableAPIAPP: boolean; // false by default
    minimizeLibraryToTray: boolean; // false by default
    lcpAutoDeleteExpiredPublications: boolean; // false by default
    // Runtime-only command-line override. It is intentionally excluded from persisted state.
    lcpAutoDeleteExpiredPublicationsForced: boolean; // false by default
    /** Hugging Face model id used for highlight-to-image generation. */
    aiImageModelId: string;
}

export const settingsAiImageModelId = (settings?: Partial<ISettingsState>): string =>
    resolveAiImageModelId(settings?.aiImageModelId ?? DEFAULT_AI_IMAGE_MODEL_ID);

export const settingsMinimizeLibraryToTrayIsEnabled = (settings?: Partial<ISettingsState>) =>
    settings?.minimizeLibraryToTray === true;

export const settingsLcpAutoDeleteExpiredPublicationsIsEnabled = (settings?: Partial<ISettingsState>) =>
    settings?.lcpAutoDeleteExpiredPublications === true ||
    settings?.lcpAutoDeleteExpiredPublicationsForced === true;
