// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { TAiImageGenerationStatus } from "readium-desktop/common/redux/actions/reader/aiImage/status";

// Transient per-note AI image generation status, keyed by note uuid. Used to
// show a loading spinner / error in the annotation UI while the local model
// runs. Not persisted: the finished image lives on the note (generatedImagePath).
export type IAiImageState = Record<string, {
    status: TAiImageGenerationStatus;
    error?: string;
}>;
