// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as React from "react";

import { Link } from "@r2-shared-js/models/publication-link";

import { useSelector } from "readium-desktop/renderer/common/hooks/useSelector";
import { useTranslator } from "readium-desktop/renderer/common/hooks/useTranslator";
import { IReaderRootState } from "readium-desktop/common/redux/states/renderer/readerRootState";
import { INoteState } from "readium-desktop/common/redux/states/renderer/note";

import { IReaderMenuProps } from "../options-values";
import { computeProgression } from "./ReaderMenu";
import { getAnnotationPanelNavigation, getAnnotationSelectionText } from "../../pdf/pdfAnnotationPanel";

// Strip a URL fragment (#...) so spine hrefs and TOC hrefs can be compared.
const hrefWithoutFragment = (href: string | undefined): string =>
    (href || "").split("#")[0];

// Recursively search the TOC for the first entry whose href matches `href`,
// returning its (display) title.
const findTocTitle = (links: Link[] | undefined, href: string): string | undefined => {
    if (!links?.length) {
        return undefined;
    }
    for (const link of links) {
        if (hrefWithoutFragment(link.Href) === href && link.Title) {
            return link.Title;
        }
        const childTitle = findTocTitle(link.Children, href);
        if (childTitle) {
            return childTitle;
        }
    }
    return undefined;
};

interface IGalleryEntry {
    note: INoteState;
    spineIndex: number;
    progression: number;
    chapterTitle: string;
    imageUrl: string;
}

export const ImageGalleryList: React.FC<
    Pick<IReaderMenuProps, "goToLocator" | "goToPdfAnnotation">
> = (props) => {

    const { goToLocator, goToPdfAnnotation } = props;
    const [__] = useTranslator();

    const notes = useSelector((state: IReaderRootState) => state.reader.note);
    const r2Publication = useSelector((state: IReaderRootState) => state.reader.info.r2Publication);
    const pubId = useSelector((state: IReaderRootState) => state.reader.info.publicationIdentifier);
    const dockedMode = useSelector((state: IReaderRootState) => state.reader.config.readerDockingMode !== "full");

    const entries = React.useMemo<IGalleryEntry[]>(() => {
        const spine: Link[] = r2Publication?.Spine || [];

        const chapterTitleFor = (spineIndex: number, href: string): string => {
            const cleanHref = hrefWithoutFragment(href);
            const fromToc = findTocTitle(r2Publication?.TOC, cleanHref);
            if (fromToc) {
                return fromToc;
            }
            const spineItem = spineIndex >= 0 ? spine[spineIndex] : undefined;
            if (spineItem?.Title) {
                return spineItem.Title;
            }
            // Last resort: the resource file name, so each chapter still has a label.
            const segment = cleanHref.split("/").pop();
            return segment || __("reader.marks.images");
        };

        return notes
            .filter((note) => note.group === "annotation" && !!note.generatedImagePath)
            .map((note): IGalleryEntry => {
                const locator = note.locatorExtended?.locator;
                const href = locator?.href;
                const spineIndex = href ? spine.findIndex((s) => s.Href === href) : -1;
                const progression = locator ? computeProgression(spine, locator) : Number.POSITIVE_INFINITY;
                return {
                    note,
                    spineIndex,
                    progression,
                    chapterTitle: chapterTitleFor(spineIndex, href),
                    imageUrl: `store://${pubId}/${note.generatedImagePath}`,
                };
            })
            .sort((a, b) => {
                // Order by chapter (spine index) first; entries without a known
                // spine position sink to the bottom. Within a chapter, order by
                // reading progression (annotation order).
                if (a.spineIndex !== b.spineIndex) {
                    if (a.spineIndex < 0) {
                        return 1;
                    }
                    if (b.spineIndex < 0) {
                        return -1;
                    }
                    return a.spineIndex - b.spineIndex;
                }
                return a.progression - b.progression;
            });
    }, [notes, r2Publication, pubId, __]);

    const navigateToNote = React.useCallback((note: INoteState) => {
        const nav = getAnnotationPanelNavigation(note);
        const closeNavPanel = !dockedMode;
        if (nav?.type === "epub") {
            goToLocator(nav.locator, closeNavPanel);
        } else if (nav?.type === "pdf") {
            goToPdfAnnotation(nav.target, closeNavPanel);
        }
    }, [dockedMode, goToLocator, goToPdfAnnotation]);

    if (!entries.length) {
        return (
            <p style={{ padding: "10px", color: "var(--color-gray-500)" }}>
                {__("reader.annotations.noGeneratedImages")}
            </p>
        );
    }

    // Group consecutive entries (already sorted) by chapter for display headers.
    const groups: Array<{ key: string; chapterTitle: string; items: IGalleryEntry[] }> = [];
    for (const entry of entries) {
        const key = `${entry.spineIndex}`;
        const last = groups[groups.length - 1];
        if (last && last.key === key) {
            last.items.push(entry);
        } else {
            groups.push({ key, chapterTitle: entry.chapterTitle, items: [entry] });
        }
    }

    return (
        <div>
            {groups.map((group) => (
                <section key={group.key} style={{ marginBottom: "16px" }}>
                    <h3 style={{
                        fontSize: "14px",
                        margin: "8px 0",
                        color: "var(--color-gray-600)",
                        borderBottom: "1px solid var(--color-gray-100)",
                        paddingBottom: "4px",
                    }}>
                        {group.chapterTitle}
                    </h3>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                        gap: "10px",
                    }}>
                        {group.items.map((entry) => {
                            const caption = getAnnotationSelectionText(entry.note) || entry.note.textualValue || "";
                            const percent = Number.isFinite(entry.progression) ? `${Math.round(entry.progression)}%` : "";
                            return (
                                <figure key={entry.note.uuid} style={{ margin: 0 }}>
                                    <button
                                        type="button"
                                        title={`${__("reader.goToContent")}${percent ? ` (${percent})` : ""}`}
                                        aria-label={`${__("reader.goToContent")} ${caption}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            navigateToNote(entry.note);
                                        }}
                                        style={{
                                            border: "none",
                                            background: "none",
                                            padding: 0,
                                            cursor: "pointer",
                                            width: "100%",
                                            display: "block",
                                        }}
                                    >
                                        <img
                                            src={entry.imageUrl}
                                            alt={caption}
                                            style={{
                                                width: "100%",
                                                height: "120px",
                                                objectFit: "cover",
                                                borderRadius: "4px",
                                                border: "1px solid var(--color-gray-100)",
                                                display: "block",
                                            }}
                                        />
                                    </button>
                                    <figcaption style={{
                                        fontSize: "11px",
                                        color: "var(--color-gray-500)",
                                        marginTop: "4px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: "6px",
                                    }}>
                                        <span style={{
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}>{caption}</span>
                                        {percent ? <span style={{ flex: "0 0 auto" }}>{percent}</span> : null}
                                    </figcaption>
                                </figure>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
};
