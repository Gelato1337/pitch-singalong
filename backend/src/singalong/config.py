"""Loads tunable numbers from the shared config/tuning.json."""

import json
from functools import cache
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]
TUNING_PATH = REPO_ROOT / "config" / "tuning.json"
SCHEMA_PATH = REPO_ROOT / "schema" / "song.schema.json"
SONG_SCHEMA_VERSION = 1


@cache
def tuning() -> dict[str, Any]:
    return json.loads(TUNING_PATH.read_text())
