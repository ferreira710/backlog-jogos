import httpx

from app.core.config import settings


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


def test_returns_503_when_api_key_is_not_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "rawg_api_key", "")

    response = client.get("/games/external-search?q=zelda")

    assert response.status_code == 503


def test_maps_rawg_results_to_the_external_schema(client, monkeypatch):
    monkeypatch.setattr(settings, "rawg_api_key", "fake-key")
    payload = {
        "results": [
            {
                "id": 123,
                "name": "The Legend of Zelda",
                "released": "1986-02-21",
                "background_image": "https://example.com/zelda.jpg",
            }
        ]
    }
    monkeypatch.setattr(
        "app.services.external_games.httpx.get",
        lambda *args, **kwargs: _FakeResponse(payload),
    )

    response = client.get("/games/external-search?q=zelda")

    assert response.status_code == 200
    assert response.json() == [
        {
            "external_id": 123,
            "name": "The Legend of Zelda",
            "released": "1986-02-21",
            "cover_image_url": "https://example.com/zelda.jpg",
        }
    ]


def test_prioritizes_matches_that_start_with_the_query(client, monkeypatch):
    monkeypatch.setattr(settings, "rawg_api_key", "fake-key")
    # Ordem de "relevancia" que a RAWG de fato devolve para "holl": nenhum
    # criterio de prefixo, so fuzzy match — Hollow Knight vem depois de
    # titulos sem relacao nenhuma com o prefixo digitado.
    payload = {
        "results": [
            {"id": 1, "name": "Jupiter Hell", "released": None, "background_image": None},
            {"id": 2, "name": "Silent Hill", "released": None, "background_image": None},
            {"id": 3, "name": "Hollow Knight", "released": None, "background_image": None},
            {
                "id": 4,
                "name": "Hollow Knight: Silksong",
                "released": None,
                "background_image": None,
            },
        ]
    }
    monkeypatch.setattr(
        "app.services.external_games.httpx.get",
        lambda *args, **kwargs: _FakeResponse(payload),
    )

    response = client.get("/games/external-search?q=holl")

    names = [item["name"] for item in response.json()]
    assert names == [
        "Hollow Knight",
        "Hollow Knight: Silksong",
        "Jupiter Hell",
        "Silent Hill",
    ]


def test_returns_503_when_rawg_request_fails(client, monkeypatch):
    monkeypatch.setattr(settings, "rawg_api_key", "fake-key")

    def _raise(*args, **kwargs):
        raise httpx.ConnectTimeout("timed out")

    monkeypatch.setattr("app.services.external_games.httpx.get", _raise)

    response = client.get("/games/external-search?q=zelda")

    assert response.status_code == 503


def test_rejects_empty_query(client):
    assert client.get("/games/external-search?q=").status_code == 422
    assert client.get("/games/external-search").status_code == 422
