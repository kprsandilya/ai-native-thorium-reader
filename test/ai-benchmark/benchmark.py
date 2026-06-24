#!/usr/bin/env python3
"""Benchmark suite for the Thorium AI image-generation engine.

Drives the local FastAPI ``/generate`` endpoint with a wide variety of prompts
(see ``prompts.py``) and reports latency / throughput statistics, broken down
per category. Results are written as JSON + CSV, and generated images can be
saved for visual inspection.

This is pure standard library (``urllib``) so it runs with any Python 3.9+
without installing anything extra.

The engine must already be running, e.g.::

    npm run ai-engine:dev          # starts uvicorn on 127.0.0.1:8000

Then, from the repo root::

    python test/ai-benchmark/benchmark.py
    python test/ai-benchmark/benchmark.py --repeat 3 --save-images
    python test/ai-benchmark/benchmark.py --model black-forest-labs/FLUX.1-dev-FP8 --steps 28
    python test/ai-benchmark/benchmark.py --categories book_excerpts art_styles --limit-per-category 2
"""

from __future__ import annotations

import argparse
import base64
import csv
import datetime as _dt
import json
import math
import statistics
import sys
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

# Allow running both as `python test/ai-benchmark/benchmark.py` and as a module.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import prompts as prompt_set  # noqa: E402

DEFAULT_BASE_URL = "http://127.0.0.1:8000"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "results"
WARMUP_PROMPT = "a single green leaf on a white background"


@dataclass
class RunResult:
    category: str
    prompt: str
    run_index: int
    ok: bool
    latency_s: float
    model_id: Optional[str] = None
    device: Optional[str] = None
    image_bytes: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    error: Optional[str] = None
    saved_path: Optional[str] = None


@dataclass
class Stats:
    count: int = 0
    ok: int = 0
    failed: int = 0
    mean_s: Optional[float] = None
    median_s: Optional[float] = None
    stdev_s: Optional[float] = None
    min_s: Optional[float] = None
    max_s: Optional[float] = None
    p90_s: Optional[float] = None
    p95_s: Optional[float] = None
    throughput_per_min: Optional[float] = None


def percentile(sorted_vals: List[float], p: float) -> Optional[float]:
    """Linear-interpolation percentile (p in [0, 100])."""
    if not sorted_vals:
        return None
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    k = (len(sorted_vals) - 1) * (p / 100.0)
    lo = math.floor(k)
    hi = math.ceil(k)
    if lo == hi:
        return sorted_vals[int(k)]
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * (k - lo)


def compute_stats(results: List[RunResult]) -> Stats:
    latencies = sorted(r.latency_s for r in results if r.ok)
    ok = len(latencies)
    failed = sum(1 for r in results if not r.ok)
    stats = Stats(count=len(results), ok=ok, failed=failed)
    if latencies:
        total = sum(latencies)
        stats.mean_s = statistics.mean(latencies)
        stats.median_s = statistics.median(latencies)
        stats.stdev_s = statistics.pstdev(latencies) if len(latencies) > 1 else 0.0
        stats.min_s = latencies[0]
        stats.max_s = latencies[-1]
        stats.p90_s = percentile(latencies, 90)
        stats.p95_s = percentile(latencies, 95)
        stats.throughput_per_min = (ok / total * 60.0) if total > 0 else None
    return stats


def png_dimensions(data: bytes) -> tuple[Optional[int], Optional[int]]:
    """Read width/height from a PNG byte stream without an image library."""
    if len(data) >= 24 and data[:8] == b"\x89PNG\r\n\x1a\n":
        width = int.from_bytes(data[16:20], "big")
        height = int.from_bytes(data[20:24], "big")
        return width, height
    return None, None


def check_health(base_url: str, timeout: float) -> Dict[str, Any]:
    url = f"{base_url.rstrip('/')}/health"
    with urllib.request.urlopen(url, timeout=timeout) as resp:  # noqa: S310 - localhost
        return json.loads(resp.read().decode("utf-8"))


def call_generate(
    base_url: str,
    payload: Dict[str, Any],
    timeout: float,
) -> tuple[bool, Dict[str, Any], float, Optional[str]]:
    """POST to /generate. Returns (ok, data, elapsed_seconds, error)."""
    url = f"{base_url.rstrip('/')}/generate"
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 - localhost
            data = json.loads(resp.read().decode("utf-8"))
        elapsed = time.perf_counter() - start
        return True, data, elapsed, None
    except urllib.error.HTTPError as e:
        elapsed = time.perf_counter() - start
        detail = e.read().decode("utf-8", errors="replace")
        return False, {}, elapsed, f"HTTP {e.code}: {detail[:300]}"
    except Exception as e:  # noqa: BLE001 - network/timeout/etc, keep going
        elapsed = time.perf_counter() - start
        return False, {}, elapsed, f"{type(e).__name__}: {e}"


def fmt(value: Optional[float], suffix: str = "s") -> str:
    return "-" if value is None else f"{value:.2f}{suffix}"


def print_table(rows: List[List[str]], headers: List[str]) -> None:
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))
    line = "  ".join(h.ljust(widths[i]) for i, h in enumerate(headers))
    print(line)
    print("  ".join("-" * widths[i] for i in range(len(headers))))
    for row in rows:
        print("  ".join(cell.ljust(widths[i]) for i, cell in enumerate(row)))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Benchmark the Thorium AI image-generation engine.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="AI engine base URL.")
    parser.add_argument("--model", default=None, help="Model id (defaults to the engine's configured model).")
    parser.add_argument("--steps", type=int, default=None, help="num_inference_steps override.")
    parser.add_argument("--guidance", type=float, default=None, help="guidance_scale override.")
    parser.add_argument("--seed", type=int, default=None, help="Fixed RNG seed for reproducible images.")
    parser.add_argument("--repeat", type=int, default=1, help="Times to run each prompt (for variance).")
    parser.add_argument("--timeout", type=float, default=600.0, help="Per-request timeout (seconds).")
    parser.add_argument("--categories", nargs="*", default=None, help="Only run these categories.")
    parser.add_argument("--limit-per-category", type=int, default=None, help="Cap prompts per category.")
    parser.add_argument("--no-warmup", action="store_true", help="Skip the warmup (model-load) request.")
    parser.add_argument("--save-images", action="store_true", help="Write generated PNGs to the run folder.")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Base folder for results.")
    parser.add_argument("--list-categories", action="store_true", help="Print categories and exit.")
    args = parser.parse_args()

    if args.list_categories:
        for category, items in prompt_set.grouped().items():
            print(f"{category} ({len(items)})")
        return 0

    selected = prompt_set.select(args.categories, args.limit_per_category)
    if not selected:
        print("No prompts selected (check --categories).", file=sys.stderr)
        return 2

    # --- health check ----------------------------------------------------
    print(f"Checking engine health at {args.base_url} ...")
    try:
        health = check_health(args.base_url, timeout=10.0)
    except Exception as e:  # noqa: BLE001
        print(
            f"ERROR: could not reach the AI engine at {args.base_url} ({e}).\n"
            f"Start it first, e.g. `npm run ai-engine:dev`.",
            file=sys.stderr,
        )
        return 1
    print(f"  engine ok: {health}")

    run_stamp = _dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir = Path(args.output_dir) / run_stamp
    run_dir.mkdir(parents=True, exist_ok=True)

    def base_payload(prompt: str) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"prompt": prompt}
        if args.model:
            payload["model_id"] = args.model
        if args.steps is not None:
            payload["num_inference_steps"] = args.steps
        if args.guidance is not None:
            payload["guidance_scale"] = args.guidance
        if args.seed is not None:
            payload["seed"] = args.seed
        return payload

    # --- warmup (excluded from stats) ------------------------------------
    cold_start_s: Optional[float] = None
    if not args.no_warmup:
        print("Warming up (loading model; this first call can be slow) ...")
        ok, data, elapsed, err = call_generate(args.base_url, base_payload(WARMUP_PROMPT), args.timeout)
        if ok:
            cold_start_s = elapsed
            print(f"  warmup ok in {elapsed:.2f}s on device "
                  f"{data.get('device', '?')} (model {data.get('model_id', '?')})")
        else:
            print(f"  WARNING: warmup failed: {err}", file=sys.stderr)

    total_runs = len(selected) * args.repeat
    print(f"\nRunning {len(selected)} prompts x {args.repeat} = {total_runs} generations ...\n")

    results: List[RunResult] = []
    run_no = 0
    wall_start = time.perf_counter()
    for run_index in range(args.repeat):
        for category, prompt in selected:
            run_no += 1
            ok, data, elapsed, err = call_generate(args.base_url, base_payload(prompt), args.timeout)

            image_bytes = width = height = None
            saved_path = None
            if ok:
                b64 = data.get("image_base64", "")
                try:
                    raw = base64.b64decode(b64) if b64 else b""
                except Exception:  # noqa: BLE001
                    raw = b""
                image_bytes = len(raw)
                width, height = png_dimensions(raw)
                if args.save_images and raw:
                    safe = "".join(c if c.isalnum() else "_" for c in prompt)[:40].strip("_")
                    fname = f"{category}__{safe}__r{run_index}.png"
                    out_path = run_dir / "images" / fname
                    out_path.parent.mkdir(parents=True, exist_ok=True)
                    out_path.write_bytes(raw)
                    saved_path = str(out_path)

            results.append(RunResult(
                category=category,
                prompt=prompt,
                run_index=run_index,
                ok=ok,
                latency_s=round(elapsed, 4),
                model_id=data.get("model_id") if ok else None,
                device=data.get("device") if ok else None,
                image_bytes=image_bytes,
                width=width,
                height=height,
                error=err,
                saved_path=saved_path,
            ))

            status = f"{elapsed:6.2f}s" if ok else "FAILED"
            short = (prompt[:50] + "...") if len(prompt) > 50 else prompt
            print(f"  [{run_no:>3}/{total_runs}] {status}  {category:<18} {short}")
            if not ok:
                print(f"        -> {err}", file=sys.stderr)

    wall_total = time.perf_counter() - wall_start

    # --- aggregate -------------------------------------------------------
    overall = compute_stats(results)
    per_category: Dict[str, Stats] = {}
    for category in prompt_set.categories():
        cat_results = [r for r in results if r.category == category]
        if cat_results:
            per_category[category] = compute_stats(cat_results)

    device = next((r.device for r in results if r.device), health.get("device", "?"))
    model_used = next((r.model_id for r in results if r.model_id), args.model or "engine-default")

    # --- console report --------------------------------------------------
    print("\n" + "=" * 72)
    print("BENCHMARK SUMMARY")
    print("=" * 72)
    print(f"engine     : {args.base_url}")
    print(f"model      : {model_used}")
    print(f"device     : {device}")
    print(f"steps      : {args.steps if args.steps is not None else 'model-default'}")
    print(f"guidance   : {args.guidance if args.guidance is not None else 'model-default'}")
    print(f"seed       : {args.seed if args.seed is not None else 'random'}")
    print(f"cold start : {fmt(cold_start_s)} (warmup, excluded from stats)")
    print(f"wall clock : {fmt(wall_total)} for {overall.count} generations "
          f"({overall.ok} ok, {overall.failed} failed)")
    print()

    headers = ["category", "n", "ok", "mean", "median", "p90", "p95", "min", "max", "img/min"]
    rows: List[List[str]] = []
    for category, s in per_category.items():
        rows.append([
            category, str(s.count), str(s.ok),
            fmt(s.mean_s), fmt(s.median_s), fmt(s.p90_s), fmt(s.p95_s),
            fmt(s.min_s), fmt(s.max_s),
            fmt(s.throughput_per_min, ""),
        ])
    rows.append([
        "ALL", str(overall.count), str(overall.ok),
        fmt(overall.mean_s), fmt(overall.median_s), fmt(overall.p90_s), fmt(overall.p95_s),
        fmt(overall.min_s), fmt(overall.max_s),
        fmt(overall.throughput_per_min, ""),
    ])
    print_table(rows, headers)

    # --- write artifacts -------------------------------------------------
    summary = {
        "timestamp": run_stamp,
        "base_url": args.base_url,
        "model": model_used,
        "device": device,
        "steps": args.steps,
        "guidance": args.guidance,
        "seed": args.seed,
        "repeat": args.repeat,
        "warmup_cold_start_s": cold_start_s,
        "wall_clock_s": round(wall_total, 4),
        "overall": asdict(overall),
        "per_category": {k: asdict(v) for k, v in per_category.items()},
        "engine_health": health,
    }
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    (run_dir / "results.json").write_text(
        json.dumps([asdict(r) for r in results], indent=2), encoding="utf-8"
    )
    with (run_dir / "results.csv").open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(asdict(results[0]).keys()))
        writer.writeheader()
        for r in results:
            writer.writerow(asdict(r))

    print(f"\nArtifacts written to: {run_dir}")
    print("  - summary.json (config + aggregate stats)")
    print("  - results.json (per-run detail)")
    print("  - results.csv  (per-run detail, spreadsheet-friendly)")
    if args.save_images:
        print("  - images/      (generated PNGs)")

    # Non-zero exit if anything failed, so CI can flag regressions.
    return 0 if overall.failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
