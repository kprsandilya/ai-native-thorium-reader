// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { Action } from "readium-desktop/common/models/redux";
import { MiniLocatorExtended } from "readium-desktop/common/redux/states/locatorInitialState";

export const ID = "READER_ANNOTATIONS_SET_LOCATOR";

interface IPayload {
    locatorExtended: MiniLocatorExtended;
}

// Re-point the in-progress annotation to the reader's current text selection
// (used by the "refresh selected text" button in the annotation editor popover).
export function build(locatorExtended: MiniLocatorExtended): Action<typeof ID, IPayload> {
    return {
        type: ID,
        payload: { locatorExtended },
    };
}
build.toString = () => ID; // Redux StringableActionCreator
export type TAction = ReturnType<typeof build>;
