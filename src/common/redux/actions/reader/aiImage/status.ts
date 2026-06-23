// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { ActionWithReaderPublicationIdentifierDestination } from "readium-desktop/common/models/sync";

export const ID = "READER_AI_IMAGE_STATUS";

export type TAiImageGenerationStatus = "pending" | "success" | "error";

export interface IPayload {
    noteUuid: string;
    status: TAiImageGenerationStatus;
    error?: string;
}

export function build(publicationIdentifier: string, noteUuid: string, status: TAiImageGenerationStatus, error?: string):
    ActionWithReaderPublicationIdentifierDestination<typeof ID, IPayload> {

    return {
        type: ID,
        payload: {
            noteUuid,
            status,
            error,
        },
        destination: {
            publicationIdentifier,
        },
    };
}
build.toString = () => ID; // Redux StringableActionCreator
export type TAction = ReturnType<typeof build>;
