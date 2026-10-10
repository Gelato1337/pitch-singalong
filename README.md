# Sing-Along Pitch Coach

A free, local app that takes any song file, finds the lead vocal melody, and scores your singing live against it. Correct notes, octaves and in-key harmonies all count.

Heavy analysis (vocal separation, melody, key, chords) runs once per song in a local Python backend. Everything real-time (playback, mic pitch, scoring) runs in the browser.

**Status:** Phase 1 (setup) done. See [docs/SPEC.md](docs/SPEC.md) for the full spec and roadmap.

## Layout

```
backend/   Python 3.11+, FastAPI, uv, pytest. Analysis pipeline + API + `analyze` CLI
frontend/  TypeScript, Vite, React, vitest. Piano roll, live mic pitch, scoring
schema/    song.schema.json: the backend/frontend contract (+ example)
config/    tuning.json: every tunable number (thresholds, windows, tier points)
docs/      Spec and roadmap
```

## Requirements

- [uv](https://docs.astral.sh/uv/) (installs Python for you)
- Node.js 20+
- ffmpeg (needed from phase 2)

## Run

```bash
npm install        # root helper (concurrently)
npm run setup      # backend deps (uv sync) + frontend deps (npm install)
npm run dev        # backend on :8000, frontend on http://localhost:5173
```

The frontend proxies `/api` to the backend; the page shows "Backend OK" when the health check passes. Health check directly: `curl http://127.0.0.1:8000/api/health`.

Run either side alone:

```bash
cd backend && uv run uvicorn singalong.api:app --reload --port 8000
cd frontend && npm run dev
```

## Test

```bash
npm test                       # both
cd backend && uv run pytest    # backend only
cd frontend && npm test        # frontend only
```

## CLI

```bash
cd backend && uv run analyze path/to/song.mp3   # pipeline arrives in phase 2
```

## song.json schema

`schema/song.schema.json` is the source of truth. After changing it, bump `version`, update `SONG_SCHEMA_VERSION` in `backend/src/singalong/config.py`, and regenerate the TypeScript types:

```bash
npm run gen:types   # writes frontend/src/types/song.ts
```

## Tuning

All thresholds and scoring weights are in `config/tuning.json`. The backend reads it via `singalong.config.tuning()`, the frontend imports it from `src/config.ts`.
