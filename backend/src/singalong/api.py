"""HTTP API. Run with: uv run uvicorn singalong.api:app --reload"""

from fastapi import FastAPI

from singalong import __version__
from singalong.config import SONG_SCHEMA_VERSION

app = FastAPI(title="Sing-Along Pitch Coach")


@app.get("/api/health")
def health() -> dict[str, object]:
    return {"status": "ok", "version": __version__, "song_schema_version": SONG_SCHEMA_VERSION}
