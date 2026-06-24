"""A wide, categorized set of prompts for benchmarking image generation.

The Thorium use case turns *highlighted book text* into an image, so the set
deliberately mixes short keyword-style prompts, descriptive scene prompts,
explicit art-style prompts, and realistic book-excerpt sentences (the closest
thing to what real users will feed the engine).

Each entry is a (category, prompt) pair. Keep prompts deterministic and free of
trailing whitespace so runs are reproducible.
"""

from __future__ import annotations

from typing import Dict, List, Tuple

# (category, prompt)
PROMPTS: List[Tuple[str, str]] = [
    # --- simple_objects: short, single-subject prompts -------------------
    ("simple_objects", "a red apple on a wooden table"),
    ("simple_objects", "a vintage brass key"),
    ("simple_objects", "a steaming cup of coffee"),
    ("simple_objects", "an open leather-bound book"),
    ("simple_objects", "a single burning candle"),

    # --- minimal: one or two words, stresses sparse prompts ---------------
    ("minimal", "mountain"),
    ("minimal", "ocean"),
    ("minimal", "forest at night"),
    ("minimal", "cathedral"),

    # --- nature_landscape -------------------------------------------------
    ("nature_landscape", "a misty pine forest at dawn with sunbeams"),
    ("nature_landscape", "rolling green hills under a dramatic stormy sky"),
    ("nature_landscape", "a frozen waterfall in a snowy canyon"),
    ("nature_landscape", "a desert with towering sand dunes at sunset"),
    ("nature_landscape", "a tropical beach with turquoise water and palm trees"),

    # --- animals ----------------------------------------------------------
    ("animals", "a majestic stag standing in a foggy meadow"),
    ("animals", "a curious red fox in autumn leaves"),
    ("animals", "a humpback whale breaching the ocean surface"),
    ("animals", "a barn owl in mid-flight at twilight"),

    # --- people_characters ------------------------------------------------
    ("people_characters", "an elderly fisherman mending his nets at the docks"),
    ("people_characters", "a young woman reading by candlelight in a library"),
    ("people_characters", "a knight in weathered armor on a battlefield"),
    ("people_characters", "a street musician playing violin in the rain"),

    # --- architecture -----------------------------------------------------
    ("architecture", "a gothic cathedral interior with stained glass windows"),
    ("architecture", "a narrow cobblestone street in an old European town"),
    ("architecture", "a futuristic glass skyscraper at golden hour"),
    ("architecture", "an ancient stone bridge over a quiet river"),

    # --- food -------------------------------------------------------------
    ("food", "a rustic loaf of freshly baked sourdough bread"),
    ("food", "a colorful bowl of ramen with soft-boiled egg"),
    ("food", "a slice of chocolate cake on a porcelain plate"),

    # --- fantasy_scifi ----------------------------------------------------
    ("fantasy_scifi", "a dragon perched atop a crumbling tower at dusk"),
    ("fantasy_scifi", "a glowing portal in an enchanted forest"),
    ("fantasy_scifi", "a derelict spaceship drifting past a ringed planet"),
    ("fantasy_scifi", "a cyberpunk city street drenched in neon and rain"),
    ("fantasy_scifi", "a wizard's cluttered study full of potions and scrolls"),

    # --- abstract_art -----------------------------------------------------
    ("abstract_art", "swirling galaxies of liquid gold and deep violet"),
    ("abstract_art", "geometric shapes in bold primary colors, bauhaus style"),
    ("abstract_art", "a fractal pattern of interlocking blue spirals"),

    # --- art_styles: same subject rendered in distinct media --------------
    ("art_styles", "a lighthouse on a cliff, watercolor painting"),
    ("art_styles", "a lighthouse on a cliff, oil painting impasto"),
    ("art_styles", "a lighthouse on a cliff, pixel art 16-bit"),
    ("art_styles", "a lighthouse on a cliff, charcoal sketch"),
    ("art_styles", "a lighthouse on a cliff, photorealistic 35mm photograph"),

    # --- book_excerpts: realistic highlighted-text inputs -----------------
    ("book_excerpts",
     "The old house stood at the end of a long gravel drive, its windows dark "
     "and its garden overgrown with thorns."),
    ("book_excerpts",
     "She pushed open the heavy oak door and stepped into a hall lit only by "
     "the dying embers of a great fireplace."),
    ("book_excerpts",
     "Beyond the harbour the sea turned the colour of slate as the first heavy "
     "drops of rain began to fall."),
    ("book_excerpts",
     "In the valley below, the village lights flickered like fallen stars "
     "against the deepening blue of dusk."),
    ("book_excerpts",
     "He drew his cloak tighter and walked on through the snow, the only sound "
     "the crunch of his boots and the distant howl of wolves."),

    # --- long_detailed: heavy, comma-laden prompts ------------------------
    ("long_detailed",
     "an intricate fantasy map of a coastal kingdom, hand-drawn ink lines, "
     "mountains, forests, rivers, tiny towns, decorative compass rose, aged "
     "parchment texture, fine cross-hatching, highly detailed"),
    ("long_detailed",
     "a sweeping cinematic landscape of an alien jungle at golden hour, giant "
     "bioluminescent plants, floating spores, a distant waterfall, volumetric "
     "light, ultra detailed, dramatic atmosphere"),

    # --- edge_cases: numbers, punctuation, very short ---------------------
    ("edge_cases", "1984"),
    ("edge_cases", "!!! ??? ..."),
    ("edge_cases", "a"),
]


def categories() -> List[str]:
    """Return the unique category names in their first-seen order."""
    seen: List[str] = []
    for category, _ in PROMPTS:
        if category not in seen:
            seen.append(category)
    return seen


def grouped() -> Dict[str, List[str]]:
    """Return prompts grouped by category."""
    out: Dict[str, List[str]] = {}
    for category, prompt in PROMPTS:
        out.setdefault(category, []).append(prompt)
    return out


def select(
    only_categories: List[str] | None = None,
    limit_per_category: int | None = None,
) -> List[Tuple[str, str]]:
    """Filter the prompt set by category and/or cap prompts per category."""
    wanted = set(only_categories) if only_categories else None
    counts: Dict[str, int] = {}
    out: List[Tuple[str, str]] = []
    for category, prompt in PROMPTS:
        if wanted is not None and category not in wanted:
            continue
        if limit_per_category is not None:
            if counts.get(category, 0) >= limit_per_category:
                continue
            counts[category] = counts.get(category, 0) + 1
        out.append((category, prompt))
    return out
