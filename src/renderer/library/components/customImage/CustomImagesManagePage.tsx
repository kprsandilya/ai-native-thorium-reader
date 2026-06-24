// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as stylesButtons from "readium-desktop/renderer/assets/styles/components/buttons.scss";

import { clipboard } from "electron";
import * as React from "react";

import SVG from "readium-desktop/renderer/common/components/SVG";
import * as TrashIcon from "readium-desktop/renderer/assets/icons/trash-icon.svg";
import * as QuitIcon from "readium-desktop/renderer/assets/icons/close-icon.svg";
import * as ArrowLeftIcon from "readium-desktop/renderer/assets/icons/baseline-arrow_left_ios-24px.svg";
import * as ArrowRightIcon from "readium-desktop/renderer/assets/icons/baseline-arrow_forward_ios-24px.svg";
import * as DuplicateIcon from "readium-desktop/renderer/assets/icons/duplicate-icon.svg";

import LibraryLayout from "readium-desktop/renderer/library/components/layout/LibraryLayout";
import { useTranslator } from "readium-desktop/renderer/common/hooks/useTranslator";
import { useSelector } from "readium-desktop/renderer/common/hooks/useSelector";
import { useDispatch } from "readium-desktop/renderer/common/hooks/useDispatch";
import { ILibraryRootState } from "readium-desktop/common/redux/states/renderer/libraryRootState";
import { customImageActions } from "readium-desktop/common/redux/actions";
import { customImageStoreUrl } from "readium-desktop/common/redux/states/renderer/customImage";
import { AI_IMAGE_STYLES, getAiImageStyle } from "readium-desktop/common/ai/imageStyles";

type TSort = "newest" | "oldest" | "prompt";

const CustomImagesManagePage: React.FC = () => {

    const [__] = useTranslator();
    const dispatch = useDispatch();

    const list = useSelector((state: ILibraryRootState) => state.customImages.list);

    const [sort, setSort] = React.useState<TSort>("newest");
    const [styleFilter, setStyleFilter] = React.useState<string>("");
    const [query, setQuery] = React.useState<string>("");
    const [previewIndex, setPreviewIndex] = React.useState<number | undefined>(undefined);
    // uuid of the image whose prompt was just copied, for transient feedback.
    const [copiedUuid, setCopiedUuid] = React.useState<string | undefined>(undefined);

    React.useEffect(() => {
        dispatch(customImageActions.pull.build());
    }, [dispatch]);

    const copyPrompt = React.useCallback((uuid: string, prompt: string) => {
        // Use Electron's clipboard module: navigator.clipboard is unreliable in
        // these windows (permission/focus gated) and silently fails.
        clipboard.writeText(prompt || "", "clipboard");
        setCopiedUuid(uuid);
        window.setTimeout(() => setCopiedUuid((u) => (u === uuid ? undefined : u)), 1500);
    }, []);

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        const result = list.filter((img) => {
            if (styleFilter && (img.styleId || "none") !== styleFilter) {
                return false;
            }
            if (q && !(img.prompt || "").toLowerCase().includes(q)) {
                return false;
            }
            return true;
        });
        result.sort((a, b) => {
            if (sort === "newest") {
                return b.created - a.created;
            }
            if (sort === "oldest") {
                return a.created - b.created;
            }
            return (a.prompt || "").localeCompare(b.prompt || "");
        });
        return result;
    }, [list, sort, styleFilter, query]);

    // Only offer style filters that actually appear in the collection.
    const usedStyleIds = React.useMemo(() => {
        const set = new Set(list.map((i) => i.styleId || "none"));
        return AI_IMAGE_STYLES.filter((s) => set.has(s.id));
    }, [list]);

    const previewImg = previewIndex !== undefined ? filtered[previewIndex] : undefined;

    const closePreview = React.useCallback(() => setPreviewIndex(undefined), []);
    const showPrev = React.useCallback(() => {
        setPreviewIndex((i) => (i === undefined || filtered.length === 0) ? i : (i - 1 + filtered.length) % filtered.length);
    }, [filtered.length]);
    const showNext = React.useCallback(() => {
        setPreviewIndex((i) => (i === undefined || filtered.length === 0) ? i : (i + 1) % filtered.length);
    }, [filtered.length]);

    // Close the lightbox if the previewed item falls out of the filtered range
    // (e.g. the search query or style filter changes while it is open).
    React.useEffect(() => {
        if (previewIndex !== undefined && previewIndex >= filtered.length) {
            setPreviewIndex(undefined);
        }
    }, [previewIndex, filtered.length]);

    React.useEffect(() => {
        if (previewIndex === undefined) {
            return undefined;
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                showPrev();
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                showNext();
            } else if (e.key === "Escape") {
                e.preventDefault();
                closePreview();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [previewIndex, showPrev, showNext, closePreview]);

    const secondaryHeader = (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", padding: "10px 0" }}>
            <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={__("library.customImage.manage.search")}
                aria-label={__("library.customImage.manage.search")}
                style={{ flex: "1 1 220px", padding: "8px", borderRadius: "4px", border: "1px solid var(--color-gray-400)" }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {__("library.customImage.manage.sort")}
                <select value={sort} onChange={(e) => setSort(e.target.value as TSort)} style={{ padding: "6px" }}>
                    <option value="newest">{__("library.customImage.manage.sortNewest")}</option>
                    <option value="oldest">{__("library.customImage.manage.sortOldest")}</option>
                    <option value="prompt">{__("library.customImage.manage.sortPrompt")}</option>
                </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {__("reader.annotations.generateImageDialog.style")}
                <select value={styleFilter} onChange={(e) => setStyleFilter(e.target.value)} style={{ padding: "6px" }}>
                    <option value="">{__("library.customImage.manage.allStyles")}</option>
                    {usedStyleIds.map((s) => (
                        <option key={s.id} value={s.id}>{__(s.labelKey)}</option>
                    ))}
                </select>
            </label>
        </div>
    );

    return (
        <LibraryLayout title={__("library.customImage.manage.title")} secondaryHeader={secondaryHeader}>
            {!list.length ?
                <p style={{ padding: "20px", color: "var(--color-gray-400)" }}>
                    {__("library.customImage.manage.empty")}
                </p>
                : !filtered.length ?
                    <p style={{ padding: "20px", color: "var(--color-gray-400)" }}>
                        {__("library.customImage.manage.noMatch")}
                    </p>
                    :
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px", padding: "16px 0" }}>
                        {filtered.map((img, index) => {
                            const styleLabel = __(getAiImageStyle(img.styleId).labelKey);
                            return (
                                <figure key={img.uuid} style={{ margin: 0, border: "1px solid var(--color-gray-400)", borderRadius: "6px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setPreviewIndex(index)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                setPreviewIndex(index);
                                            }
                                        }}
                                        title={__("library.customImage.manage.view")}
                                        aria-label={__("library.customImage.manage.view")}
                                        style={{ cursor: "pointer", display: "block", width: "100%" }}
                                    >
                                        <img
                                            src={customImageStoreUrl(img.fileName)}
                                            alt={img.prompt}
                                            style={{ width: "100%", height: "auto", display: "block", background: "var(--color-gray-100)" }}
                                        />
                                    </div>
                                    <figcaption style={{ padding: "8px", fontSize: "12px", flex: 1 }}>
                                        <p style={{ margin: "0 0 6px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={img.prompt}>
                                            {img.prompt}
                                        </p>
                                        <p style={{ margin: 0, color: "var(--color-gray-400)" }}>
                                            {styleLabel} · {new Date(img.created).toLocaleDateString()}
                                        </p>
                                    </figcaption>
                                    <div style={{ display: "flex", gap: "8px", margin: "8px" }}>
                                        <button
                                            type="button"
                                            className={stylesButtons.button_secondary_blue}
                                            onClick={() => copyPrompt(img.uuid, img.prompt)}
                                            aria-label={__("library.customImage.manage.copyPrompt")}
                                            title={__("library.customImage.manage.copyPrompt")}
                                            style={{ flex: 1, justifyContent: "center" }}
                                        >
                                            <SVG ariaHidden svg={DuplicateIcon} />
                                            {copiedUuid === img.uuid ? __("library.customImage.manage.copied") : __("library.customImage.manage.copyPrompt")}
                                        </button>
                                        <button
                                            type="button"
                                            className={stylesButtons.button_secondary_blue}
                                            onClick={() => dispatch(customImageActions.remove.build(img.uuid))}
                                            aria-label={__("library.customImage.manage.delete")}
                                            title={__("library.customImage.manage.delete")}
                                            style={{ flex: 1, justifyContent: "center" }}
                                        >
                                            <SVG ariaHidden svg={TrashIcon} />
                                            {__("library.customImage.manage.delete")}
                                        </button>
                                    </div>
                                </figure>
                            );
                        })}
                    </div>
            }

            {previewImg ?
                <div
                    role="presentation"
                    onClick={closePreview}
                    style={{
                        position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,0.85)",
                        display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
                    }}
                >
                    <button
                        className={stylesButtons.button_transparency_icon}
                        aria-label={__("accessibility.closeDialog")}
                        onClick={closePreview}
                        style={{ position: "absolute", top: "16px", right: "16px", color: "white", zIndex: 2 }}
                    >
                        <SVG ariaHidden svg={QuitIcon} />
                    </button>

                    {filtered.length > 1 ?
                        <button
                            className={stylesButtons.button_transparency_icon}
                            aria-label={__("library.customImage.manage.previous")}
                            title={__("library.customImage.manage.previous")}
                            onClick={(e) => { e.stopPropagation(); showPrev(); }}
                            style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "white", zIndex: 2 }}
                        >
                            <SVG ariaHidden svg={ArrowLeftIcon} />
                        </button>
                        : <></>}

                    <figure
                        role="presentation"
                        onClick={(e) => e.stopPropagation()}
                        style={{ margin: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", maxWidth: "100%", maxHeight: "100%" }}
                    >
                        <img
                            src={customImageStoreUrl(previewImg.fileName)}
                            alt={previewImg.prompt}
                            style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain", borderRadius: "6px" }}
                        />
                        <figcaption style={{ color: "white", textAlign: "center", maxWidth: "90vw" }}>
                            <p style={{ margin: "0 0 8px" }} title={previewImg.prompt}>{previewImg.prompt}</p>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                                <button
                                    type="button"
                                    className={stylesButtons.button_secondary_blue}
                                    onClick={(e) => { e.stopPropagation(); copyPrompt(previewImg.uuid, previewImg.prompt); }}
                                    aria-label={__("library.customImage.manage.copyPrompt")}
                                    title={__("library.customImage.manage.copyPrompt")}
                                >
                                    <SVG ariaHidden svg={DuplicateIcon} />
                                    {copiedUuid === previewImg.uuid ? __("library.customImage.manage.copied") : __("library.customImage.manage.copyPrompt")}
                                </button>
                                <span style={{ opacity: 0.7, fontSize: "13px" }}>
                                    {(previewIndex ?? 0) + 1} / {filtered.length}
                                </span>
                            </div>
                        </figcaption>
                    </figure>

                    {filtered.length > 1 ?
                        <button
                            className={stylesButtons.button_transparency_icon}
                            aria-label={__("library.customImage.manage.next")}
                            title={__("library.customImage.manage.next")}
                            onClick={(e) => { e.stopPropagation(); showNext(); }}
                            style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", color: "white", zIndex: 2 }}
                        >
                            <SVG ariaHidden svg={ArrowRightIcon} />
                        </button>
                        : <></>}
                </div>
                : <></>}
        </LibraryLayout>
    );
};

export default CustomImagesManagePage;
