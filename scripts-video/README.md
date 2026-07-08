# Feature showcase video

Tooling that records a narrated walkthrough of Data Explorer with Playwright and
an offline text-to-speech engine, then muxes the two into a single MP4.

`data-explorer-showcase.mp4` is the rendered result (~93s, 1440×900).

## What it shows

1. **Catalog** — the home page listing data models and notebooks.
2. **Schema view** — a model's sources, dimensions, measures, reusable views,
   named queries, and raw Malloy definition.
3. **Malloy Explorer** — an interactive query rendered as a KPI + bar-chart
   dashboard, plus the generated Malloy and SQL, and shareable query URLs.
4. **Data notebooks** — markdown, live Malloy queries, and visualizations woven
   into a single narrative.

## How it works

- `record.mjs` drives the running app with Playwright, recording the session to
  video. For each scene it captures the exact millisecond offset at which the
  narration should begin (`out/offsets.json`), so audio can be placed precisely.
- `audio/` holds the narration script; each line is synthesized to a WAV with
  `pico2wave` (offline — no network TTS service required).
- `ffmpeg` places each clip at its scene offset (`adelay` + `amix`), trims the
  cold-start frames, and muxes the narration onto the trimmed video.

## Regenerate

```sh
# 1. Start the app (serves on http://localhost:5173)
npm run dev

# 2. Record the walkthrough (requires Playwright + a Chromium build)
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts-video/record.mjs

# 3. Synthesize narration (requires pico2wave / libttspico-utils)
#    and mux with ffmpeg — see the audio + ffmpeg commands used for
#    out/narration.wav and data-explorer-showcase.mp4.
```

> Note: the walkthrough uses models backed by local CSV / inline-SQL data so it
> runs without external network access. Models that read remote URLs or formats
> requiring an on-demand DuckDB extension (parquet/json/xlsx via
> `extensions.duckdb.org`) need network access to that host.
