"""Pre-fetch model weights into the local Hugging Face cache.

Run this once while online so the engine can later generate images fully
offline (set THORIUM_AI_OFFLINE=1 at runtime). Usage:

    uv run python download.py [model_id]

Defaults to the same model the engine uses (THORIUM_AI_MODEL_ID or sd-turbo).
"""

from __future__ import annotations

import os
import sys

DEFAULT_MODEL_ID = os.environ.get("THORIUM_AI_MODEL_ID", "stabilityai/sd-turbo")


def main() -> None:
    model_id = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_MODEL_ID

    from huggingface_hub import snapshot_download
    from huggingface_hub.errors import GatedRepoError

    print(f"Downloading {model_id} into the local Hugging Face cache...")
    try:
        path = snapshot_download(repo_id=model_id)
    except GatedRepoError:
        print(
            f"\nERROR: '{model_id}' is a GATED repository and your account hasn't been\n"
            f"granted access yet. Being logged in is not enough.\n\n"
            f"  1. Open https://huggingface.co/{model_id} while logged in and accept the\n"
            f"     license / conditions (click 'Agree'). Approval is usually instant.\n"
            f"  2. For FLUX FP8 single-file repos, also accept the base repo gate\n"
            f"     (e.g. https://huggingface.co/black-forest-labs/FLUX.1-dev).\n"
            f"  3. Re-run this command.\n\n"
            f"Tip: 'black-forest-labs/FLUX.1-schnell' is NOT gated if you'd rather skip this.\n",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"Done. Cached at: {path}")
    print("You can now run the engine offline with THORIUM_AI_OFFLINE=1.")


if __name__ == "__main__":
    main()
