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
import { customImageActions } from "readium-desktop/common/redux/actions";
import { takeSpawnEvery } from "readium-desktop/common/redux/sagas/takeSpawnEvery";
import { settingsAiImageModelId } from "readium-desktop/common/redux/states/settings";
import { ICustomImageRecord } from "readium-desktop/common/redux/states/renderer/customImage";
import { aiEngineGenerate } from "readium-desktop/main/ai/aiEngineProxy";
import { customImageRepositoryPath } from "readium-desktop/main/di";
import { error } from "readium-desktop/main/tools/error";
import { RootState } from "readium-desktop/main/redux/states";
import { SagaGenerator } from "typed-redux-saga";
import { all as allTyped, call as callTyped, put as putTyped, select as selectTyped } from "typed-redux-saga/macro";

// Logger
const filename_ = "readium-desktop:main:saga:ai:generateCustomImage";
const debug = debug_(filename_);

function* generateCustomImage(action: customImageActions.generateRequest.TAction): SagaGenerator<void> {

    const { uuid, prompt, negativePrompt, styleId, modelId: requestedModelId } = action.payload;

    debug(`Custom AI image generation requested ${uuid}`);

    yield* putTyped(customImageActions.status.build(uuid, "pending"));

    const settings = yield* selectTyped((state: RootState) => state.settings);
    const modelId = requestedModelId || settingsAiImageModelId(settings);

    const result = yield* callTyped(() => aiEngineGenerate({ prompt, negative_prompt: negativePrompt, model_id: modelId }));

    if (!result.ok) {
        const failure = result as { ok: false; error: string; status?: number };
        debug(`Custom AI image generation failed for ${uuid}: ${failure.error}`);
        yield* putTyped(customImageActions.status.build(uuid, "error", failure.error));
        return;
    }

    const data: IAiGenerateResponse = (result as { ok: true; data: IAiGenerateResponse }).data;

    let fileName: string;
    try {
        fileName = `custom-${uuid}.png`;
        const filePath = path.join(customImageRepositoryPath, fileName);
        const buffer = Buffer.from(data.image_base64, "base64");
        yield* callTyped(() => fs.promises.writeFile(filePath, buffer));
        debug(`Custom AI image written to ${filePath} (device: ${data.device}, model: ${data.model_id})`);
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        debug(`Custom AI image write failed for ${uuid}: ${message}`);
        yield* putTyped(customImageActions.status.build(uuid, "error", message));
        return;
    }

    const record: ICustomImageRecord = {
        uuid,
        fileName,
        prompt,
        negativePrompt,
        styleId,
        modelId: data.model_id || modelId,
        device: data.device,
        created: (new Date()).getTime(),
    };

    yield* putTyped(customImageActions.add.build(record));
    yield* putTyped(customImageActions.status.build(uuid, "success"));
}

function* deleteCustomImage(action: customImageActions.remove.TAction): SagaGenerator<void> {

    const { uuid } = action.payload;
    const list = yield* selectTyped((state: RootState) => state.customImages.list);
    const record = list.find((i) => i.uuid === uuid);
    if (!record) {
        return;
    }
    try {
        const filePath = path.join(customImageRepositoryPath, record.fileName);
        yield* callTyped(() => fs.promises.rm(filePath, { force: true }));
        debug(`Custom AI image deleted ${filePath}`);
    } catch (e) {
        debug(`Custom AI image delete failed for ${uuid}: ${e instanceof Error ? e.message : String(e)}`);
    }
}

function* pullCustomImages(): SagaGenerator<void> {
    const list = yield* selectTyped((state: RootState) => state.customImages.list);
    yield* putTyped(customImageActions.setList.build(list));
}

export function saga() {
    return allTyped([
        takeSpawnEvery(
            customImageActions.generateRequest.ID,
            generateCustomImage,
            (e) => error(filename_, e),
        ),
        takeSpawnEvery(
            customImageActions.remove.ID,
            deleteCustomImage,
            (e) => error(filename_, e),
        ),
        takeSpawnEvery(
            customImageActions.pull.ID,
            pullCustomImages,
            (e) => error(filename_, e),
        ),
    ]);
}
