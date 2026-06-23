// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { ChildProcess, spawn } from "child_process";
import debug_ from "debug";
import { app } from "electron";
import * as path from "path";

// Logger
const debug = debug_("readium-desktop:main:aiEngineProcess");

let engineProcess: ChildProcess | undefined;

function isTruthy(value: string | undefined): boolean {
    return (value || "").toLowerCase() === "1" || (value || "").toLowerCase() === "true" || (value || "").toLowerCase() === "yes";
}

// Resolve where the Python "ai-engine" project lives. In dev it's at the repo
// root; in a packaged app it's shipped via electron-builder `extraResources`
// (see package.json build.extraResources).
function resolveEngineCwd(): string {
    if (__TH__IS_PACKAGED__) {
        return path.join(process.resourcesPath, "ai-engine");
    }
    return path.join(app.getAppPath(), "ai-engine");
}

// Spawn the local Python AI engine as a child process so the whole stack runs
// as one app. OFF by default (set THORIUM_AI_ENGINE_AUTOSTART=1 to enable) so
// the existing `npm run dev:all` flow, which starts the engine separately,
// keeps working without a port clash. Safe to call unconditionally.
export function startAiEngine(): void {

    if (!isTruthy(process.env.THORIUM_AI_ENGINE_AUTOSTART)) {
        debug("ai-engine autostart disabled (set THORIUM_AI_ENGINE_AUTOSTART=1 to enable)");
        return;
    }

    if (engineProcess) {
        debug("ai-engine already started, skipping");
        return;
    }

    const cwd = resolveEngineCwd();
    // `uv run` resolves/creates the virtualenv and runs uvicorn. A fully
    // self-contained installer would instead ship a frozen executable here.
    const command = process.env.THORIUM_AI_ENGINE_CMD || "uv";
    const args = ["run", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"];

    const env = {
        ...process.env,
        HF_HOME: process.env.HF_HOME || path.join(app.getPath("userData"), "ai-models"),
    };

    try {
        debug("spawning ai-engine", command, args.join(" "), "cwd:", cwd);
        engineProcess = spawn(command, args, { cwd, env, shell: process.platform === "win32" });

        engineProcess.stdout?.on("data", (d) => debug("[ai-engine]", d.toString().trimEnd()));
        engineProcess.stderr?.on("data", (d) => debug("[ai-engine:err]", d.toString().trimEnd()));
        engineProcess.on("error", (e) => debug("ai-engine spawn error (is `uv` installed and on PATH?)", e));
        engineProcess.on("exit", (code, signal) => {
            debug("ai-engine exited", { code, signal });
            engineProcess = undefined;
        });
    } catch (e) {
        debug("failed to spawn ai-engine", e);
        engineProcess = undefined;
    }
}

export function stopAiEngine(): void {
    if (!engineProcess) {
        return;
    }
    try {
        debug("stopping ai-engine");
        engineProcess.kill();
    } catch (e) {
        debug("failed to stop ai-engine", e);
    }
    engineProcess = undefined;
}
