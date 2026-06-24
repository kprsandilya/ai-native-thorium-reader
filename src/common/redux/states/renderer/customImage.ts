// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

// Standalone AI-generated images created from the library landing page. Unlike
// reader annotation images, these are not attached to any publication; their
// metadata lives in the persisted main Redux state and the PNG files live in a
// dedicated app-data folder served through the store:// protocol using the
// reserved sentinel publication id below.

// Reserved "publication id" segment for the store:// protocol that maps to the
// standalone custom-image folder instead of a publication storage folder.
export const CUSTOM_IMAGE_STORE_PUBID = "__custom__";

export type TCustomImageStatus = "pending" | "success" | "error";

export interface ICustomImageRecord {
    uuid: string;
    // File name relative to the custom-image storage folder.
    fileName: string;
    prompt: string;
    negativePrompt?: string;
    styleId?: string;
    modelId: string;
    device?: string;
    created: number;
}

export interface ICustomImageState {
    list: ICustomImageRecord[];
    // Transient generation status keyed by request uuid.
    status: Record<string, { status: TCustomImageStatus; error?: string }>;
}

/** Build the store:// URL that serves a standalone custom image. */
export const customImageStoreUrl = (fileName: string): string =>
    `store://${CUSTOM_IMAGE_STORE_PUBID}/${fileName}`;
