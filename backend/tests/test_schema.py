import json

import jsonschema
import pytest

from singalong.config import REPO_ROOT, SCHEMA_PATH, SONG_SCHEMA_VERSION, tuning


def load_schema() -> dict:
    return json.loads(SCHEMA_PATH.read_text())


def test_schema_is_valid() -> None:
    jsonschema.Draft202012Validator.check_schema(load_schema())


def test_schema_version_matches_backend() -> None:
    assert load_schema()["properties"]["version"]["const"] == SONG_SCHEMA_VERSION


def test_example_song_validates() -> None:
    example = json.loads((REPO_ROOT / "schema" / "example.song.json").read_text())
    jsonschema.validate(example, load_schema())


def test_bad_pitch_class_rejected() -> None:
    example = json.loads((REPO_ROOT / "schema" / "example.song.json").read_text())
    example["keys"][0]["tonic"] = 12
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(example, load_schema())


def test_tuning_loads() -> None:
    assert tuning()["analysis"]["pitch_hop_s"] == 0.01
