// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

// Art-style presets shared by the reader "generate image" dialog and the
// library custom-image creation panel. A style is just a prompt suffix that is
// appended to the user's prompt before generation; keep this dependency-free so
// both renderers and (if ever needed) the main process can import it.

export type TAiImageStyleLabelKey =
    | "settings.aiImage.style.none"
    | "settings.aiImage.style.photo"
    | "settings.aiImage.style.digitalPainting"
    | "settings.aiImage.style.oil"
    | "settings.aiImage.style.watercolor"
    | "settings.aiImage.style.pencil"
    | "settings.aiImage.style.anime"
    | "settings.aiImage.style.comic"
    | "settings.aiImage.style.pixel"
    | "settings.aiImage.style.fantasy"
    | "settings.aiImage.style.render3d"
    | "settings.aiImage.style.vintage";

export interface IAiImageStyle {
    id: string;
    /** Stable key resolved to a localized label in the UI. */
    labelKey: TAiImageStyleLabelKey;
    /** Appended (verbatim) to the user prompt; empty for the "none" style. */
    promptSuffix: string;
}

export const AI_IMAGE_STYLE_NONE_ID = "none";

export const AI_IMAGE_STYLES: IAiImageStyle[] = [
    {
        id: AI_IMAGE_STYLE_NONE_ID,
        labelKey: "settings.aiImage.style.none",
        promptSuffix: "",
    },

    {
        id: "photo",
        labelKey: "settings.aiImage.style.photo",
        promptSuffix:
            ", professional photography, photorealistic, ultra-detailed, realistic materials and textures, sharp focus, cinematic composition, natural lighting, depth of field, high dynamic range, realistic shadows, color-graded, captured with a full-frame camera, award-winning photography, 8k quality",
    },

    {
        id: "digital-painting",
        labelKey: "settings.aiImage.style.digitalPainting",
        promptSuffix:
            ", highly detailed digital painting, concept art masterpiece, cinematic lighting, painterly brushwork, rich color palette, atmospheric depth, dramatic composition, intricate details, professional illustration, fantasy art quality, polished production artwork",
    },

    {
        id: "oil",
        labelKey: "settings.aiImage.style.oil",
        promptSuffix:
            ", classical oil painting, museum-quality fine art, visible textured brush strokes, layered paint, rich pigments, dramatic chiaroscuro lighting, elegant composition, highly detailed canvas texture, inspired by traditional master painters",
    },

    {
        id: "watercolor",
        labelKey: "settings.aiImage.style.watercolor",
        promptSuffix:
            ", delicate watercolor painting, translucent color washes, soft blending, subtle gradients, textured watercolor paper, hand-painted illustration, loose expressive brushwork, light and airy atmosphere, artistic and elegant composition",
    },

    {
        id: "pencil",
        labelKey: "settings.aiImage.style.pencil",
        promptSuffix:
            ", highly detailed graphite pencil drawing, realistic sketch, precise line work, cross-hatching, smooth shading, hand-drawn illustration, monochrome artwork, sketchbook quality, fine artistic detail",
    },

    {
        id: "anime",
        labelKey: "settings.aiImage.style.anime",
        promptSuffix:
            ", anime illustration, clean line art, cel shading, vibrant colors, expressive character design, detailed background, polished key visual, studio-quality anime artwork, dynamic composition, modern anime aesthetic",
    },

    {
        id: "comic",
        labelKey: "settings.aiImage.style.comic",
        promptSuffix:
            ", comic book illustration, bold inked outlines, dynamic action pose, dramatic perspective, halftone textures, vibrant comic colors, graphic novel style, highly detailed panel artwork, professional comic art",
    },

    {
        id: "pixel",
        labelKey: "settings.aiImage.style.pixel",
        promptSuffix:
            ", pixel art masterpiece, crisp pixel-perfect details, retro 16-bit video game style, carefully crafted sprite work, limited color palette, nostalgic game aesthetic, detailed pixel environment, classic RPG artwork",
    },

    {
        id: "fantasy",
        labelKey: "settings.aiImage.style.fantasy",
        promptSuffix:
            ", epic fantasy illustration, breathtaking environment, magical atmosphere, intricate details, cinematic lighting, grand scale, legendary adventure artwork, rich worldbuilding, highly detailed fantasy concept art, masterpiece quality",
    },

    {
        id: "render3d",
        labelKey: "settings.aiImage.style.render3d",
        promptSuffix:
            ", ultra-realistic 3D render, physically based rendering, ray tracing, global illumination, octane render quality, realistic materials, volumetric lighting, cinematic depth of field, highly detailed textures, studio-quality CGI",
    },

    {
        id: "vintage",
        labelKey: "settings.aiImage.style.vintage",
        promptSuffix:
            ", vintage photography, authentic film aesthetic, subtle film grain, faded colors, analog camera look, nostalgic atmosphere, aged print texture, classic composition, retro color grading, timeless photographic style",
    },
];

export function getAiImageStyle(styleId: string | undefined): IAiImageStyle {
    return AI_IMAGE_STYLES.find((s) => s.id === styleId) || AI_IMAGE_STYLES[0];
}

/** Combine a base prompt with the chosen style suffix into a final prompt. */
export function applyAiImageStyle(prompt: string, styleId: string | undefined): string {
    const base = (prompt || "").trim();
    const style = getAiImageStyle(styleId);
    if (!style.promptSuffix) {
        return base;
    }
    return `${base}${style.promptSuffix}`;
}
