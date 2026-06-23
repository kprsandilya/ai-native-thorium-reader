// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import debug_ from "debug";
import * as fs from "fs";
import path from "path";
import { IAiGenerateResponse } from "readium-desktop/common/ai/aiEngine";
import { readerActions, settingsActions } from "readium-desktop/common/redux/actions";
import { takeSpawnEvery } from "readium-desktop/common/redux/sagas/takeSpawnEvery";
import { settingsAiImageModelId } from "readium-desktop/common/redux/states/settings";
import { aiEngineGenerate, aiEngineUnload } from "readium-desktop/main/ai/aiEngineProxy";
import { diMainGet } from "readium-desktop/main/di";
import { error } from "readium-desktop/main/tools/error";
import { SagaGenerator } from "typed-redux-saga";
import { all as allTyped, call as callTyped, put as putTyped, takeEvery as takeEveryTyped } from "typed-redux-saga/macro";

// Logger
const filename_ = "readium-desktop:main:saga:ai:generateImage";
const debug = debug_(filename_);

function* generateImage(action: readerActions.aiImage.request.TAction): SagaGenerator<void> {

    const { note, prompt } = action.payload;
    const publicationIdentifier = action.destination.publicationIdentifier;
    const noteUuid = note.uuid;

    debug(`AI image generation requested for note ${noteUuid} (pub ${publicationIdentifier})`);

    // Tell the requesting reader window we've started.
    yield* putTyped(readerActions.aiImage.status.build(publicationIdentifier, noteUuid, "pending"));

    const modelId = settingsAiImageModelId(diMainGet("store").getState().settings);
    debug(`Using AI model ${modelId} for note ${noteUuid}`);

    const result = yield* callTyped(() => aiEngineGenerate({ prompt, model_id: modelId }));

    // Discriminated-union narrowing on `result.ok` is unreliable through the
    // typed-redux-saga `yield* call(...)` boundary, so extract each variant
    // explicitly rather than relying on control-flow narrowing.
    if (!result.ok) {
        const failure = result as { ok: false; error: string; status?: number };
        debug(`AI image generation failed for note ${noteUuid}: ${failure.error}`);
        yield* putTyped(readerActions.aiImage.status.build(publicationIdentifier, noteUuid, "error", failure.error));
        return;
    }

    const data: IAiGenerateResponse = (result as { ok: true; data: IAiGenerateResponse }).data;

    let relativeFileName: string;
    try {
        const pubStorage = diMainGet("publication-storage");
        const pubPath = yield* callTyped(() => pubStorage.getPublicationPath(publicationIdentifier));

        relativeFileName = `ai-image-${noteUuid}.png`;
        const filePath = path.join(pubPath, relativeFileName);

        const buffer = Buffer.from(data.image_base64, "base64");
        yield* callTyped(() => fs.promises.writeFile(filePath, buffer));

        debug(`AI image written to ${filePath} (device: ${data.device}, model: ${data.model_id})`);
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        debug(`AI image write failed for note ${noteUuid}: ${message}`);
        yield* putTyped(readerActions.aiImage.status.build(publicationIdentifier, noteUuid, "error", message));
        return;
    }

    // Persist + broadcast the updated note with the image attached. Passing the
    // existing note as previousNote makes the main note saga perform a DB UPDATE
    // and the sync middleware broadcast the change to the reader window(s).
    yield* putTyped(readerActions.note.addUpdate.build(
        publicationIdentifier,
        { ...note, generatedImagePath: relativeFileName, modified: (new Date()).getTime() },
        note,
    ));

    yield* putTyped(readerActions.aiImage.status.build(publicationIdentifier, noteUuid, "success"));
}

function* onAiImageModelChanged(action: settingsActions.aiImageModelId.TAction): SagaGenerator<void> {

    debug(`AI image model changed to ${action.payload.aiImageModelId}, unloading cached pipelines`);

    const result = yield* callTyped(() => aiEngineUnload());
    if (!result.ok) {
        const failure = result as { ok: false; error: string; status?: number };
        debug(`AI engine unload failed after model change: ${failure.error}`);
    }
}

export function saga() {
    return allTyped([
        takeSpawnEvery(
            readerActions.aiImage.request.ID,
            generateImage,
            (e) => error(filename_, e),
        ),
        takeEveryTyped(
            settingsActions.aiImageModelId.ID,
            onAiImageModelChanged,
        ),
    ]);
}
