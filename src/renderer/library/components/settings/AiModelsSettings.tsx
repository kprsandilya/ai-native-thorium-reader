// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as React from "react";

import { IAiImageModelEntry, isValidHfRepoId } from "readium-desktop/common/ai/aiEngine";
import { settingsActions } from "readium-desktop/common/redux/actions";
import { ILibraryRootState } from "readium-desktop/common/redux/states/renderer/libraryRootState";
import {
    settingsAiImageModelId,
    settingsAiImageModels,
} from "readium-desktop/common/redux/states/settings";
import { useDispatch } from "readium-desktop/renderer/common/hooks/useDispatch";
import { useSelector } from "readium-desktop/renderer/common/hooks/useSelector";
import { useTranslator } from "readium-desktop/renderer/common/hooks/useTranslator";
import * as stylesSettings from "readium-desktop/renderer/assets/styles/components/settings.scss";

const downloadStateLabel = (state: string | undefined): { text: string; color: string } => {
    switch (state) {
        case "downloaded":
            return { text: "Downloaded", color: "var(--color-success, #2e7d32)" };
        case "downloading":
            return { text: "Downloading…", color: "var(--color-blue, #1565c0)" };
        case "error":
            return { text: "Download failed", color: "var(--color-error, #c62828)" };
        default:
            return { text: "Not downloaded", color: "var(--color-medium-grey, #767676)" };
    }
};

const ModelRow: React.FC<{
    model: IAiImageModelEntry;
    isDefault: boolean;
    onSetDefault: (id: string) => void;
    onDownload: (id: string) => void;
    onRemove: (id: string) => void;
}> = ({ model, isDefault, onSetDefault, onDownload, onRemove }) => {

    const download = useSelector((state: ILibraryRootState) => state.settings.aiImageModelDownload?.[model.id]);
    const status = downloadStateLabel(download?.state);
    const isDownloading = download?.state === "downloading";

    return (
        <li
            style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 0",
                borderBottom: "1px solid var(--color-light-grey, #e0e0e0)",
                flexWrap: "wrap",
            }}
        >
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <strong style={{ wordBreak: "break-word" }}>{model.label}</strong>
                    {isDefault ? (
                        <span style={{
                            fontSize: "0.75rem",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            background: "var(--color-primary, #2c5fda)",
                            color: "white",
                        }}>Default</span>
                    ) : null}
                    {model.gated ? (
                        <span style={{
                            fontSize: "0.75rem",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            background: "var(--color-light-grey, #e0e0e0)",
                            color: "var(--color-secondary, #333)",
                        }}>Gated</span>
                    ) : null}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-medium-grey, #767676)", wordBreak: "break-all" }}>
                    {model.id}
                </div>
                <div style={{ fontSize: "0.8rem", color: status.color }}>
                    {status.text}
                    {download?.state === "error" && download.error ? ` — ${download.error}` : ""}
                </div>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {!isDefault ? (
                    <button
                        type="button"
                        onClick={() => onSetDefault(model.id)}
                    >
                        Set as default
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={() => onDownload(model.id)}
                    disabled={isDownloading}
                >
                    {isDownloading ? "Downloading…" : "Download"}
                </button>
                <button
                    type="button"
                    onClick={() => onRemove(model.id)}
                    disabled={isDownloading}
                >
                    Remove
                </button>
            </div>
        </li>
    );
};

export const AiModelsSettings: React.FC = () => {

    const [__] = useTranslator();
    const dispatch = useDispatch();

    const models = useSelector((state: ILibraryRootState) => settingsAiImageModels(state.settings));
    const defaultModelId = useSelector((state: ILibraryRootState) => settingsAiImageModelId(state.settings));

    const [newId, setNewId] = React.useState("");
    const [newLabel, setNewLabel] = React.useState("");
    const [newGated, setNewGated] = React.useState(false);
    const [formError, setFormError] = React.useState<string | undefined>(undefined);

    // Probe the engine for which models are already cached when the tab opens.
    React.useEffect(() => {
        dispatch(settingsActions.aiImageModelStatusRefresh.build());
    }, [dispatch]);

    const persist = React.useCallback((next: IAiImageModelEntry[]) => {
        dispatch(settingsActions.aiImageModels.build(next));
    }, [dispatch]);

    const onSetDefault = React.useCallback((id: string) => {
        dispatch(settingsActions.aiImageModelId.build(id));
    }, [dispatch]);

    const onDownload = React.useCallback((id: string) => {
        dispatch(settingsActions.aiImageModelDownloadRequest.build(id));
    }, [dispatch]);

    const onRemove = React.useCallback((id: string) => {
        const next = models.filter((m) => m.id !== id);
        persist(next);
        // If we removed the default, fall back to the first remaining model.
        if (id === defaultModelId && next.length > 0) {
            dispatch(settingsActions.aiImageModelId.build(next[0].id));
        }
    }, [models, defaultModelId, persist, dispatch]);

    const onAdd = React.useCallback(() => {
        const id = newId.trim();
        const label = newLabel.trim() || id.split("/").pop() || id;
        if (!isValidHfRepoId(id)) {
            setFormError("Enter a valid Hugging Face model id, e.g. owner/name.");
            return;
        }
        if (models.some((m) => m.id === id)) {
            setFormError("This model is already in the list.");
            return;
        }
        setFormError(undefined);
        persist([...models, { id, label, gated: newGated, builtin: false }]);
        setNewId("");
        setNewLabel("");
        setNewGated(false);
    }, [newId, newLabel, newGated, models, persist]);

    const onRefresh = React.useCallback(() => {
        dispatch(settingsActions.aiImageModelStatusRefresh.build());
    }, [dispatch]);

    return (
        <section className={stylesSettings.section}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                <h3>{__("settings.tabs.aiModels")}</h3>
                <button type="button" onClick={onRefresh}>
                    Refresh status
                </button>
            </div>
            <p style={{ color: "var(--color-medium-grey, #767676)" }}>
                Add any Hugging Face text-to-image model by its repo id (owner/name), set one as the
                default used for highlight-to-image and custom image generation, and download weights
                ahead of time. Large GPU models can take a long time to download.
            </p>

            <ul style={{ listStyle: "none", margin: "12px 0", padding: 0 }}>
                {models.length === 0 ? (
                    <li style={{ color: "var(--color-medium-grey, #767676)" }}>No models yet.</li>
                ) : (
                    models.map((model) => (
                        <ModelRow
                            key={model.id}
                            model={model}
                            isDefault={model.id === defaultModelId}
                            onSetDefault={onSetDefault}
                            onDownload={onDownload}
                            onRemove={onRemove}
                        />
                    ))
                )}
            </ul>

            <div style={{ marginTop: "16px" }}>
                <h4>Add a model</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "520px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span>Hugging Face model id</span>
                        <input
                            type="text"
                            value={newId}
                            onChange={(e) => setNewId(e.target.value)}
                            placeholder="e.g. black-forest-labs/FLUX.1-schnell"
                            style={{ padding: "6px 8px" }}
                        />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span>Display name (optional)</span>
                        <input
                            type="text"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="e.g. FLUX.1-schnell"
                            style={{ padding: "6px 8px" }}
                        />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input type="checkbox" checked={newGated} onChange={(e) => setNewGated(e.target.checked)} />
                        <span>Gated repo (requires accepting a license on Hugging Face)</span>
                    </label>
                    {formError ? (
                        <p style={{ color: "var(--color-error, #c62828)", margin: 0 }}>{formError}</p>
                    ) : null}
                    <div>
                        <button type="button" className={stylesSettings.btn_primary} onClick={onAdd}>
                            Add model
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};
