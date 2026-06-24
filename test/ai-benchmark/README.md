# AI image-generation benchmark

A standalone benchmarking suite for the local Thorium AI engine
(`ai-engine/main.py`). It drives the `/generate` endpoint with a wide,
categorized set of prompts and reports latency / throughput statistics.

It is **pure standard library** (no `pip install` needed) and works with any
Python 3.9+.

## What it measures

For each prompt (optionally repeated N times) it records the end-to-end request
latency against the running engine, then aggregates:

- mean / median / standard deviation
- min / max
- p90 / p95
- throughput (images per minute)

Results are broken down **per prompt category** and overall. The model-loading
"cold start" is measured by a warmup call and reported separately so it does not
skew the steady-state numbers.

## Prompt set

See `prompts.py`. Categories include simple objects, minimal prompts, nature,
animals, people, architecture, food, fantasy/sci-fi, abstract art, explicit art
styles (same subject across watercolor/oil/pixel-art/etc.), realistic
book-excerpt sentences (the actual Thorium use case: highlighted text), long
detailed prompts, and edge cases (numbers, punctuation, single characters).

## Running

1. Start the engine (in a separate terminal):

```bash
npm run ai-engine:dev
```

2. Run the benchmark from the repo root:

```bash
python test/ai-benchmark/benchmark.py
```

Or via the npm script:

```bash
npm run ai-engine:benchmark
```

### Useful options

```bash
# Repeat each prompt 3 times to measure variance, and save the PNGs:
python test/ai-benchmark/benchmark.py --repeat 3 --save-images

# Benchmark a specific model with explicit steps (e.g. FLUX):
python test/ai-benchmark/benchmark.py --model black-forest-labs/FLUX.1-dev-FP8 --steps 28

# Only a couple of categories, fixed seed for reproducible images:
python test/ai-benchmark/benchmark.py --categories book_excerpts art_styles --seed 42

# List available categories and exit:
python test/ai-benchmark/benchmark.py --list-categories
```

Run `python test/ai-benchmark/benchmark.py --help` for the full list.

## Output

Each run creates a timestamped folder under `test/ai-benchmark/results/`:

- `summary.json` — run config + aggregate stats (overall and per-category)
- `results.json` — per-run detail (latency, device, image size, errors, ...)
- `results.csv` — the same per-run detail, spreadsheet-friendly
- `images/` — generated PNGs (only with `--save-images`)

The process exits non-zero if any generation failed, so it can gate CI.

> Note: this benchmark requires the engine and its model weights, so it is not
> part of the default `npm test` (Jest) unit-test run.
