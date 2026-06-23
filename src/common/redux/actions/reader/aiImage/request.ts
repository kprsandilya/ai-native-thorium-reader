// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { ActionWithReaderPublicationIdentifierDestination } from "readium-desktop/common/models/sync";
import { INoteState } from "readium-desktop/common/redux/states/renderer/note";

export const ID = "READER_AI_IMAGE_REQUEST";

export interface IPayload {
    // The note this image is generated for. Carried in full so the main process
    // can persist the updated note (with generatedImagePath) without depending on
    // any main-side copy of the reader note state.
    note: INoteState;
    // Text prompt used for generation (typically the highlighted text).
    prompt: string;
}

export function build(publicationIdentifier: string, note: INoteState, prompt: string):
    ActionWithReaderPublicationIdentifierDestination<typeof ID, IPayload> {

    return {
        type: ID,
        payload: {
            note,
            prompt,
        },
        destination: {
            publicationIdentifier,
        },
    };
}
build.toString = () => ID; // Redux StringableActionCreator
export type TAction = ReturnType<typeof build>;
