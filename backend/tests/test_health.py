from fastapi.testclient import TestClient

from singalong.api import app


def test_health() -> None:
    response = TestClient(app).get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["song_schema_version"] == 1
