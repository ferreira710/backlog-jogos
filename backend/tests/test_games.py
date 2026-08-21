def test_create_game_applies_defaults(client, payload):
    response = client.post("/games", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Hollow Knight"
    assert body["status"] == "backlog"
    assert body["rating"] is None
    assert body["hours_played"] == 0
    # title_normalized e detalhe interno; nao deve vazar na API.
    assert "title_normalized" not in body


def test_timestamps_are_utc_aware(client, payload):
    body = client.post("/games", json=payload).json()

    # Sem offset o cliente nao tem como saber que o horario e UTC.
    assert body["created_at"].endswith("Z") or "+00:00" in body["created_at"]


def test_title_is_stripped(client, payload):
    body = client.post("/games", json={**payload, "title": "  Celeste  "}).json()

    assert body["title"] == "Celeste"


def test_get_game(client, payload):
    game_id = client.post("/games", json=payload).json()["id"]

    response = client.get(f"/games/{game_id}")

    assert response.status_code == 200
    assert response.json()["id"] == game_id


def test_get_missing_game_returns_404(client):
    assert client.get("/games/999").status_code == 404


def test_update_game_partially(client, payload):
    game_id = client.post("/games", json=payload).json()["id"]

    response = client.patch(f"/games/{game_id}", json={"status": "finished", "rating": 9})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "finished"
    assert body["rating"] == 9
    assert body["title"] == "Hollow Knight"


def test_update_bumps_updated_at(client, payload):
    created = client.post("/games", json=payload).json()

    updated = client.patch(f"/games/{created['id']}", json={"hours_played": 12.5}).json()

    assert updated["updated_at"] >= created["updated_at"]
    assert updated["created_at"] == created["created_at"]


def test_rating_can_be_cleared_with_null(client, payload):
    game_id = client.post("/games", json={**payload, "rating": 7}).json()["id"]

    response = client.patch(f"/games/{game_id}", json={"rating": None})

    assert response.status_code == 200
    assert response.json()["rating"] is None


def test_explicit_null_on_required_field_is_rejected(client, payload):
    game_id = client.post("/games", json=payload).json()["id"]

    for field in ("title", "platform", "status", "hours_played"):
        response = client.patch(f"/games/{game_id}", json={field: None})
        assert response.status_code == 422, field

    assert client.get(f"/games/{game_id}").json()["title"] == "Hollow Knight"


def test_invalid_payloads_are_rejected(client, payload):
    assert client.post("/games", json={**payload, "rating": 11}).status_code == 422
    assert client.post("/games", json={**payload, "title": ""}).status_code == 422
    assert client.post("/games", json={**payload, "title": "   "}).status_code == 422
    assert client.post("/games", json={**payload, "platform": "atari"}).status_code == 422
    assert client.post("/games", json={**payload, "hours_played": -1}).status_code == 422


def test_delete_game(client, payload):
    game_id = client.post("/games", json=payload).json()["id"]

    assert client.delete(f"/games/{game_id}").status_code == 204
    assert client.get(f"/games/{game_id}").status_code == 404
    assert client.delete(f"/games/{game_id}").status_code == 404


class TestDuplicates:
    def test_same_title_and_platform_returns_409(self, client, payload):
        client.post("/games", json=payload)

        response = client.post("/games", json=payload)

        assert response.status_code == 409
        assert "Hollow Knight" in response.json()["detail"]

    def test_duplicate_check_ignores_case_accents_and_spacing(self, client):
        client.post("/games", json={"title": "Pokémon", "platform": "nintendo"})

        for variant in ("POKEMON", "pokemon", "  Pokémon  ", "Pokémon"):
            response = client.post("/games", json={"title": variant, "platform": "nintendo"})
            assert response.status_code == 409, variant

    def test_internal_whitespace_still_distinguishes_titles(self, client):
        client.post("/games", json={"title": "Poke mon", "platform": "nintendo"})

        # "pokemon" != "poke mon": colapsar espacos nao e o mesmo que remove-los.
        response = client.post("/games", json={"title": "Pokemon", "platform": "nintendo"})
        assert response.status_code == 201

    def test_same_title_on_another_platform_is_allowed(self, client, payload):
        assert client.post("/games", json=payload).status_code == 201
        assert client.post("/games", json={**payload, "platform": "xbox"}).status_code == 201

    def test_update_into_an_existing_pair_returns_409(self, client, payload):
        client.post("/games", json=payload)
        other_id = client.post("/games", json={**payload, "title": "Celeste"}).json()["id"]

        response = client.patch(f"/games/{other_id}", json={"title": "hollow knight"})

        assert response.status_code == 409

    def test_update_keeping_own_title_is_allowed(self, client, payload):
        game_id = client.post("/games", json=payload).json()["id"]

        response = client.patch(f"/games/{game_id}", json={"title": "Hollow Knight", "rating": 10})

        assert response.status_code == 200
        assert response.json()["rating"] == 10

    def test_renaming_frees_the_old_pair(self, client, payload):
        game_id = client.post("/games", json=payload).json()["id"]
        client.patch(f"/games/{game_id}", json={"title": "Silksong"})

        assert client.post("/games", json=payload).status_code == 201


class TestListing:
    def test_envelope_reports_total_beyond_the_page(self, client, payload):
        for title in ("A", "B", "C"):
            client.post("/games", json={**payload, "title": title})

        body = client.get("/games?limit=2").json()

        assert len(body["items"]) == 2
        assert body["total"] == 3
        assert body["skip"] == 0
        assert body["limit"] == 2

    def test_total_respects_filters(self, client, payload):
        client.post("/games", json={**payload, "title": "A", "status": "playing"})
        client.post("/games", json={**payload, "title": "B"})

        assert client.get("/games?status=playing").json()["total"] == 1

    def test_filters(self, client, payload):
        client.post("/games", json={**payload, "title": "A", "status": "playing"})
        client.post("/games", json={**payload, "title": "B", "platform": "xbox"})

        playing = client.get("/games?status=playing").json()["items"]
        xbox = client.get("/games?platform=xbox").json()["items"]

        assert [g["title"] for g in playing] == ["A"]
        assert [g["title"] for g in xbox] == ["B"]

    def test_pages_do_not_overlap(self, client, payload):
        for title in ("A", "B", "C"):
            client.post("/games", json={**payload, "title": title})

        page_one = client.get("/games?limit=2").json()["items"]
        page_two = client.get("/games?limit=2&skip=2").json()["items"]

        assert len(page_one) == 2 and len(page_two) == 1
        assert {g["id"] for g in page_one}.isdisjoint({g["id"] for g in page_two})

    def test_search_ignores_case_and_accents(self, client):
        client.post("/games", json={"title": "Pokémon Scarlet", "platform": "nintendo"})
        client.post("/games", json={"title": "Elden Ring", "platform": "pc"})

        for term in ("pokemon", "POKEMON", "scarlet", "Pokémon"):
            items = client.get(f"/games?search={term}").json()["items"]
            assert [g["title"] for g in items] == ["Pokémon Scarlet"], term

    def test_search_with_no_match_returns_empty_page(self, client, payload):
        client.post("/games", json=payload)

        body = client.get("/games?search=zelda").json()

        assert body["items"] == []
        assert body["total"] == 0

    def test_sorting(self, client, payload):
        client.post("/games", json={**payload, "title": "Celeste", "rating": 8})
        client.post("/games", json={**payload, "title": "Alba", "rating": 5})
        client.post("/games", json={**payload, "title": "Braid", "rating": 10})

        def titles(query):
            return [g["title"] for g in client.get(f"/games?{query}").json()["items"]]

        assert titles("sort=title&order=asc") == ["Alba", "Braid", "Celeste"]
        assert titles("sort=title&order=desc") == ["Celeste", "Braid", "Alba"]
        assert titles("sort=rating&order=desc") == ["Braid", "Celeste", "Alba"]

    def test_rejects_invalid_query_params(self, client):
        assert client.get("/games?limit=0").status_code == 422
        assert client.get("/games?limit=101").status_code == 422
        assert client.get("/games?skip=-1").status_code == 422
        assert client.get("/games?sort=publisher").status_code == 422
        assert client.get("/games?order=sideways").status_code == 422
