// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as stylesButtons from "readium-desktop/renderer/assets/styles/components/buttons.scss";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";

import SVG from "readium-desktop/renderer/common/components/SVG";
import Loader from "readium-desktop/renderer/common/components/Loader";
import * as PaletteIcon from "readium-desktop/renderer/assets/icons/palette-icon.svg";
import * as QuitIcon from "readium-desktop/renderer/assets/icons/close-icon.svg";
import * as LoaderIcon from "readium-desktop/renderer/assets/icons/loader.svg";

import { useTranslator } from "readium-desktop/renderer/common/hooks/useTranslator";
import { useSelector } from "readium-desktop/renderer/common/hooks/useSelector";
import { useDispatch } from "readium-desktop/renderer/common/hooks/useDispatch";
import { ILibraryRootState } from "readium-desktop/common/redux/states/renderer/libraryRootState";
import { customImageActions } from "readium-desktop/common/redux/actions";
import { customImageStoreUrl } from "readium-desktop/common/redux/states/renderer/customImage";
import { AI_IMAGE_STYLES, AI_IMAGE_STYLE_NONE_ID, applyAiImageStyle } from "readium-desktop/common/ai/imageStyles";
import { settingsAiImageModelId, settingsAiImageModels } from "readium-desktop/common/redux/states/settings";
import { ComboBox, ComboBoxItem } from "readium-desktop/renderer/common/components/ComboBox";
import { uuidv4 } from "readium-desktop/utils/uuid";

export const CustomImageCreatePanel: React.FC = () => {

    const [__] = useTranslator();
    const dispatch = useDispatch();

    const list = useSelector((state: ILibraryRootState) => state.customImages.list);
    const status = useSelector((state: ILibraryRootState) => state.customImages.status);
    const defaultModelId = useSelector((state: ILibraryRootState) => settingsAiImageModelId(state.settings));
    const availableModels = useSelector((state: ILibraryRootState) => settingsAiImageModels(state.settings));

    const [open, setOpen] = React.useState(false);
    const [prompt, setPrompt] = React.useState("");
    const [negativePrompt, setNegativePrompt] = React.useState("");
    const [styleId, setStyleId] = React.useState(AI_IMAGE_STYLE_NONE_ID);
    const [modelId, setModelId] = React.useState(defaultModelId);
    // Track the most recent generation request so we can show progress and
    // auto-close the panel once it lands.
    const [pendingUuid, setPendingUuid] = React.useState<string | undefined>(undefined);

    React.useEffect(() => {
        if (open) {
            dispatch(customImageActions.pull.build());
            setModelId(defaultModelId);
        }
    }, [open, dispatch, defaultModelId]);

    const pendingStatus = pendingUuid ? status[pendingUuid] : undefined;
    const isGenerating = pendingStatus?.status === "pending";
    const hasError = pendingStatus?.status === "error";

    // When the tracked generation succeeds, close the panel; keep it open on error.
    React.useEffect(() => {
        if (pendingUuid && status[pendingUuid]?.status === "success") {
            setPendingUuid(undefined);
            setOpen(false);
        }
    }, [status, pendingUuid]);

    const generate = React.useCallback(() => {
        const base = prompt.trim();
        if (!base) {
            return;
        }
        const uuid = uuidv4();
        setPendingUuid(uuid);
        dispatch(customImageActions.generateRequest.build({
            uuid,
            prompt: applyAiImageStyle(base, styleId),
            negativePrompt: negativePrompt.trim() || undefined,
            styleId,
            modelId,
        }));
    }, [dispatch, prompt, negativePrompt, styleId, modelId]);

    const modelOptions = availableModels.map((model, index) => ({
        id: index + 1,
        value: model.id,
        name: model.label,
    }));
    const selectedModelKey = modelOptions.find(({ value }) => value === modelId)?.id;

    const pendingCount = Object.values(status).filter((s) => s.status === "pending").length;
    const recent = list.slice(0, 6);

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <button title={__("library.customImage.create.title")} className="R2_CSS_CLASS__FORCE_NO_FOCUS_OUTLINE">
                    <SVG ariaHidden svg={PaletteIcon} />
                    <h3>{__("library.customImage.create.nav")}</h3>
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 800 }} />
                <Dialog.Content
                    aria-describedby={undefined}
                    style={{
                        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 801,
                        width: "min(440px, 96vw)", height: "100vh", overflowY: "auto",
                        background: "var(--color-gray-50)", color: "var(--color-text-primary)",
                        boxShadow: "-4px 0 24px rgba(0,0,0,0.3)", padding: "20px",
                    }}
                >
                    {isGenerating ?
                        <div
                            role="status"
                            aria-live="polite"
                            style={{
                                position: "absolute", inset: 0, zIndex: 5,
                                background: "rgba(0,0,0,0.45)", backdropFilter: "blur(1px)",
                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px",
                            }}
                        >
                            <Loader />
                            <p style={{ color: "white", fontWeight: 600, margin: 0 }}>
                                {__("library.customImage.create.generating")}
                            </p>
                        </div>
                        : <></>}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        <Dialog.Title style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                            <SVG ariaHidden svg={PaletteIcon} />
                            {__("library.customImage.create.title")}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className={stylesButtons.button_transparency_icon} aria-label={__("accessibility.closeDialog")}>
                                <SVG ariaHidden svg={QuitIcon} />
                            </button>
                        </Dialog.Close>
                    </div>

                    <label htmlFor="custom-image-prompt" style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>
                        {__("reader.annotations.generateImageDialog.prompt")}
                    </label>
                    <textarea
                        id="custom-image-prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={4}
                        placeholder={__("library.customImage.create.promptPlaceholder")}
                        style={{ width: "100%", resize: "vertical", padding: "8px", borderRadius: "4px", border: "1px solid var(--color-gray-400)" }}
                    />

                    <fieldset style={{ border: "none", padding: 0, margin: "14px 0 0" }}>
                        <legend style={{ fontWeight: 600, marginBottom: "6px", padding: 0 }}>
                            {__("reader.annotations.generateImageDialog.style")}
                        </legend>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {AI_IMAGE_STYLES.map((style) => {
                                const selected = style.id === styleId;
                                return (
                                    <button
                                        key={style.id}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => setStyleId(style.id)}
                                        style={{
                                            padding: "6px 12px", borderRadius: "16px", cursor: "pointer",
                                            border: selected ? "2px solid var(--color-brand-primary)" : "1px solid var(--color-gray-400)",
                                            background: selected ? "var(--color-brand-primary)" : "transparent",
                                            color: selected ? "white" : "var(--color-text-primary)",
                                            fontWeight: selected ? 600 : 400,
                                        }}
                                    >
                                        {__(style.labelKey)}
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>

                    <label htmlFor="custom-image-negative" style={{ display: "block", fontWeight: 600, margin: "14px 0 4px" }}>
                        {__("reader.annotations.generateImageDialog.negativePrompt")}
                    </label>
                    <textarea
                        id="custom-image-negative"
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        rows={2}
                        placeholder={__("reader.annotations.generateImageDialog.negativePromptPlaceholder")}
                        style={{ width: "100%", resize: "vertical", padding: "8px", borderRadius: "4px", border: "1px solid var(--color-gray-400)" }}
                    />

                    <div style={{ margin: "14px 0" }}>
                        <ComboBox
                            label={__("settings.aiImage.modelChoice")}
                            items={modelOptions}
                            selectedKey={selectedModelKey}
                            onSelectionChange={(key: React.Key) => {
                                const chosen = modelOptions.find((o) => o.id === key);
                                if (chosen) {
                                    setModelId(chosen.value);
                                }
                            }}
                            svg={PaletteIcon}
                        >
                            {item => <ComboBoxItem>{item.name}</ComboBoxItem>}
                        </ComboBox>
                    </div>

                    <button
                        type="button"
                        className={stylesButtons.button_primary_blue}
                        disabled={!prompt.trim() || isGenerating}
                        onClick={generate}
                        style={{ width: "100%", justifyContent: "center" }}
                    >
                        <SVG ariaHidden svg={isGenerating ? LoaderIcon : PaletteIcon} />
                        {isGenerating ? __("library.customImage.create.generating") : __("library.customImage.create.generate")}
                        {!isGenerating && pendingCount > 0 ? ` (${pendingCount})` : ""}
                    </button>

                    {hasError ?
                        <p style={{ marginTop: "12px", color: "var(--color-error-text)" }}>
                            {__("library.customImage.create.error")}
                            {pendingStatus?.error ? `: ${pendingStatus.error}` : ""}
                        </p>
                        : <></>}

                    {recent.length ?
                        <div style={{ marginTop: "20px" }}>
                            <h4 style={{ marginBottom: "8px" }}>{__("library.customImage.create.recent")}</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "8px" }}>
                                {recent.map((img) => (
                                    <figure key={img.uuid} style={{ margin: 0 }}>
                                        <img
                                            src={customImageStoreUrl(img.fileName)}
                                            alt={img.prompt}
                                            title={img.prompt}
                                            style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "4px", border: "1px solid var(--color-gray-400)" }}
                                        />
                                    </figure>
                                ))}
                            </div>
                        </div>
                        : <></>}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
