import httpx

from app.core.config import settings
from app.schemas.game import ExternalGameResult

# Maximo aceito pela RAWG. Pedimos o teto para dar material para o
# reranking abaixo escolher — o endpoint devolve so os 10 primeiros.
_CANDIDATE_POOL_SIZE = 40
_RESULT_LIMIT = 10


class ExternalSearchUnavailable(Exception):
    """RAWG nao esta configurado (sem API key) ou nao respondeu."""


def _rank(name: str, query: str) -> int:
    """0 = comeca com a busca, 1 = contem em algum lugar, 2 = so relevancia da RAWG.

    A RAWG faz busca fuzzy por relevancia, nao por prefixo: para termos curtos
    (3-4 letras) ela mistura "Silent Hill" e "Hell Architect" junto com
    "Hollow Knight" ao buscar "Holl". Isso reordena o que ela ja devolveu para
    o caso comum (usuario digitando o comeco do titulo) aparecer primeiro,
    sem inventar resultado que a RAWG nao tenha retornado.
    """
    lower_name = name.casefold()
    lower_query = query.casefold()
    if lower_name.startswith(lower_query):
        return 0
    if lower_query in lower_name:
        return 1
    return 2


def search_external_games(query: str) -> list[ExternalGameResult]:
    if not settings.rawg_api_key:
        raise ExternalSearchUnavailable("RAWG_API_KEY nao configurada")

    try:
        response = httpx.get(
            f"{settings.rawg_base_url}/games",
            params={
                "key": settings.rawg_api_key,
                "search": query,
                "page_size": _CANDIDATE_POOL_SIZE,
            },
            timeout=5.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise ExternalSearchUnavailable(f"Falha ao consultar RAWG: {exc}") from exc

    candidates = response.json().get("results", [])
    # sorted() e estavel: dentro de cada grupo, mantem a ordem de relevancia da RAWG.
    candidates.sort(key=lambda item: _rank(item["name"], query))

    return [
        ExternalGameResult(
            external_id=item["id"],
            name=item["name"],
            released=item.get("released"),
            cover_image_url=item.get("background_image"),
        )
        for item in candidates[:_RESULT_LIMIT]
    ]
