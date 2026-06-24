// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import debug_ from "debug";
import { settingsActions } from "readium-desktop/common/redux/actions";
import { takeSpawnEvery } from "readium-desktop/common/redux/sagas/takeSpawnEvery";
import { takeSpawnLeading } from "readium-desktop/common/redux/sagas/takeSpawnLeading";
import { settingsAiImageModels } from "readium-desktop/common/redux/states/settings";
import { aiEngineDownload, aiEngineModelStatus } from "readium-desktop/main/ai/aiEngineProxy";
import { error } from "readium-desktop/main/tools/error";
import { RootState } from "readium-desktop/main/redux/states";
import { SagaGenerator } from "typed-redux-saga";
import { all as allTyped, call as callTyped, put as putTyped, select as selectTyped } from "typed-redux-saga/macro";

// Logger
const filename_ = "readium-desktop:main:saga:ai:manageModels";
const debug = debug_(filename_);

function* downloadModel(action: settingsActions.aiImageModelDownloadRequest.TAction): SagaGenerator<void> {

    const { modelId } = action.payload;
    debug(`AI model download requested: ${modelId}`);

    // The reducer already flips this model to "downloading"; broadcast it too so
    // other windows reflect the in-progress state.
    yield* putTyped(settingsActions.aiImageModelDownloadStatus.build(modelId, "downloading"));

    const result = yield* callTyped(() => aiEngineDownload(modelId));

    if (!result.ok) {
        const failure = result as { ok: false; error: string; status?: number };
        debug(`AI model download failed for ${modelId}: ${failure.error}`);
        yield* putTyped(settingsActions.aiImageModelDownloadStatus.build(modelId, "error", failure.error));
        return;
    }

    debug(`AI model download completed: ${modelId}`);
    yield* putTyped(settingsActions.aiImageModelDownloadStatus.build(modelId, "downloaded"));
}

function* refreshModelStatus(): SagaGenerator<void> {

    const settings = yield* selectTyped((state: RootState) => state.settings);
    const models = settingsAiImageModels(settings);

    debug(`Refreshing download status for ${models.length} model(s)`);

    for (const model of models) {
        // Don't clobber an in-progress download with a status check.
        const current = settings.aiImageModelDownload?.[model.id]?.state;
        if (current === "downloading") {
            continue;
        }

        const result = yield* callTyped(() => aiEngineModelStatus(model.id));
        if (!result.ok) {
            // Engine unreachable / errored: mark unknown (idle) rather than error.
            yield* putTyped(settingsActions.aiImageModelDownloadStatus.build(model.id, "idle"));
            continue;
        }

        const data = (result as { ok: true; data: { model_id: string; downloaded: boolean; detail: string } }).data;
        yield* putTyped(settingsActions.aiImageModelDownloadStatus.build(
            model.id,
            data.downloaded ? "downloaded" : "idle",
        ));
    }
}

export function saga() {
    return allTyped([
        takeSpawnEvery(
            settingsActions.aiImageModelDownloadRequest.ID,
            downloadModel,
            (e) => error(filename_, e),
        ),
        takeSpawnLeading(
            settingsActions.aiImageModelStatusRefresh.ID,
            refreshModelStatus,
            (e) => error(filename_, e),
        ),
    ]);
}
