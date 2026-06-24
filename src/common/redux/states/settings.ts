// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import {
    BUILTIN_AI_IMAGE_MODELS,
    DEFAULT_AI_IMAGE_MODEL_ID,
    IAiImageModelDownloadStatus,
    IAiImageModelEntry,
} from "readium-desktop/common/ai/aiEngine";

export interface ISettingsState {
    enableAPIAPP: boolean; // false by default
    minimizeLibraryToTray: boolean; // false by default
    lcpAutoDeleteExpiredPublications: boolean; // false by default
    // Runtime-only command-line override. It is intentionally excluded from persisted state.
    lcpAutoDeleteExpiredPublicationsForced: boolean; // false by default
    /** Hugging Face model id used for highlight-to-image generation (the default/selected model). */
    aiImageModelId: string;
    /** User-editable registry of selectable AI image models (persisted). */
    aiImageModels?: IAiImageModelEntry[];
    /** Transient per-model download status keyed by model id (NOT persisted). */
    aiImageModelDownload?: Record<string, IAiImageModelDownloadStatus>;
}

/**
 * Resolved list of selectable models. An unset registry (e.g. freshly migrated
 * state) falls back to the built-ins; an explicitly emptied registry is honored
 * so users can remove any model, including the defaults.
 */
export const settingsAiImageModels = (settings?: Partial<ISettingsState>): IAiImageModelEntry[] => {
    const list = settings?.aiImageModels;
    return Array.isArray(list) ? list : BUILTIN_AI_IMAGE_MODELS;
};

export const settingsAiImageModelId = (settings?: Partial<ISettingsState>): string => {
    const models = settingsAiImageModels(settings);
    const id = settings?.aiImageModelId;
    if (id && models.some((m) => m.id === id)) {
        return id;
    }
    return models[0]?.id ?? DEFAULT_AI_IMAGE_MODEL_ID;
};

export const settingsAiImageModelDownload = (
    settings: Partial<ISettingsState> | undefined,
    modelId: string,
): IAiImageModelDownloadStatus | undefined => settings?.aiImageModelDownload?.[modelId];

export const settingsMinimizeLibraryToTrayIsEnabled = (settings?: Partial<ISettingsState>) =>
    settings?.minimizeLibraryToTray === true;

export const settingsLcpAutoDeleteExpiredPublicationsIsEnabled = (settings?: Partial<ISettingsState>) =>
    settings?.lcpAutoDeleteExpiredPublications === true ||
    settings?.lcpAutoDeleteExpiredPublicationsForced === true;
