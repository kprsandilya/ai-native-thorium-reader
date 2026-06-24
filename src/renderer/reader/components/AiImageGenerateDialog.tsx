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
import * as PaletteIcon from "readium-desktop/renderer/assets/icons/palette-icon.svg";
import * as QuitIcon from "readium-desktop/renderer/assets/icons/close-icon.svg";

import { useTranslator } from "readium-desktop/renderer/common/hooks/useTranslator";
import { useSelector } from "readium-desktop/renderer/common/hooks/useSelector";
import { useDispatch } from "readium-desktop/renderer/common/hooks/useDispatch";
import { IReaderRootState } from "readium-desktop/common/redux/states/renderer/readerRootState";
import { readerLocalActionAnnotations } from "readium-desktop/renderer/reader/redux/actions";
import { AI_IMAGE_STYLES, AI_IMAGE_STYLE_NONE_ID, applyAiImageStyle } from "readium-desktop/common/ai/imageStyles";

export const AiImageGenerateDialog: React.FC = () => {

    const [__] = useTranslator();
    const dispatch = useDispatch();

    const open = useSelector((state: IReaderRootState) => state.aiImageDialog.open);
    const draft = useSelector((state: IReaderRootState) => state.aiImageDialog.draft);

    const [prompt, setPrompt] = React.useState("");
    const [negativePrompt, setNegativePrompt] = React.useState("");
    const [styleId, setStyleId] = React.useState(AI_IMAGE_STYLE_NONE_ID);

    // Reset the form to the incoming draft each time the dialog opens.
    React.useEffect(() => {
        if (open) {
            setPrompt(draft?.prompt || "");
            setNegativePrompt("");
            setStyleId(AI_IMAGE_STYLE_NONE_ID);
        }
    }, [open, draft]);

    const close = React.useCallback(() => {
        dispatch(readerLocalActionAnnotations.aiImageDialogClose.build());
    }, [dispatch]);

    const canGenerate = !!draft?.locatorExtended?.selectionInfo && !!prompt.trim();

    const generate = React.useCallback(() => {
        if (!draft?.locatorExtended || !prompt.trim()) {
            return;
        }
        const finalPrompt = applyAiImageStyle(prompt, styleId);
        dispatch(readerLocalActionAnnotations.generateImageForSelection.build(
            draft.locatorExtended,
            draft.color,
            draft.drawType,
            draft.tags,
            draft.comment,
            finalPrompt,
            negativePrompt.trim() || undefined,
        ));
    }, [dispatch, draft, prompt, negativePrompt, styleId]);

    return (
        <Dialog.Root open={open} onOpenChange={(o) => { if (!o) { close(); } }}>
            <Dialog.Portal>
                <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200 }} />
                <Dialog.Content
                    aria-describedby={undefined}
                    style={{
                        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                        zIndex: 201, width: "min(640px, 92vw)", maxHeight: "88vh", overflowY: "auto",
                        background: "var(--color-gray-50)", color: "var(--color-text-primary)",
                        borderRadius: "8px", padding: "20px", boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        <Dialog.Title style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                            <SVG ariaHidden svg={PaletteIcon} />
                            {__("reader.annotations.generateImageDialog.title")}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className={stylesButtons.button_transparency_icon} aria-label={__("accessibility.closeDialog")}>
                                <SVG ariaHidden svg={QuitIcon} />
                            </button>
                        </Dialog.Close>
                    </div>

                    <label htmlFor="ai-image-prompt" style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>
                        {__("reader.annotations.generateImageDialog.prompt")}
                    </label>
                    <textarea
                        id="ai-image-prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={4}
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

                    <label htmlFor="ai-image-negative" style={{ display: "block", fontWeight: 600, margin: "14px 0 4px" }}>
                        {__("reader.annotations.generateImageDialog.negativePrompt")}
                    </label>
                    <textarea
                        id="ai-image-negative"
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        rows={2}
                        placeholder={__("reader.annotations.generateImageDialog.negativePromptPlaceholder")}
                        style={{ width: "100%", resize: "vertical", padding: "8px", borderRadius: "4px", border: "1px solid var(--color-gray-400)" }}
                    />
                    <p style={{ fontSize: "12px", color: "var(--color-gray-400)", marginTop: "4px" }}>
                        {__("reader.annotations.generateImageDialog.negativePromptHelp")}
                    </p>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
                        <button type="button" className={stylesButtons.button_secondary_blue} onClick={close}>
                            {__("dialog.cancel")}
                        </button>
                        <button type="button" className={stylesButtons.button_primary_blue} disabled={!canGenerate} onClick={generate}>
                            <SVG ariaHidden svg={PaletteIcon} />
                            {__("reader.annotations.generateImage")}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
