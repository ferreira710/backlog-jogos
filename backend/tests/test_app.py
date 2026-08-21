"""Health check e CORS — o que o frontend Vite precisa antes de qualquer rota."""

import pytest

from app.core.config import settings
from app.core.database import get_session
from app.main import app

VITE_ORIGIN = "http://localhost:5173"


def test_health_reports_database_up(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "up"}


def test_health_reports_503_when_database_is_down(client):
    class BrokenSession:
        def exec(self, *_args, **_kwargs):
            raise RuntimeError("connection refused")

    app.dependency_overrides[get_session] = lambda: BrokenSession()
    try:
        response = client.get("/health")
    finally:
        app.dependency_overrides.pop(get_session, None)

    # 200 com o banco fora do ar faria um orquestrador manter o container servindo.
    assert response.status_code == 503
    assert response.json()["database"] == "down"


def test_vite_dev_origin_is_allowed_by_default():
    assert VITE_ORIGIN in settings.cors_origins


def test_simple_request_gets_cors_header(client, payload):
    response = client.get("/games", headers={"Origin": VITE_ORIGIN})

    assert response.headers["access-control-allow-origin"] == VITE_ORIGIN


@pytest.mark.parametrize("method", ["POST", "PATCH", "DELETE"])
def test_preflight_allows_write_methods(client, method):
    response = client.options(
        "/games",
        headers={
            "Origin": VITE_ORIGIN,
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == VITE_ORIGIN
    assert method in response.headers["access-control-allow-methods"]


def test_unknown_origin_is_not_allowed(client):
    response = client.get("/games", headers={"Origin": "http://evil.example"})

    assert "access-control-allow-origin" not in response.headers
