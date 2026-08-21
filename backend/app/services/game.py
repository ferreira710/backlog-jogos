from datetime import UTC, datetime

from sqlmodel import Session, col, func, select

from app.models.game import Game, GameStatus, Platform, normalize_title
from app.schemas.game import GameCreate, GameUpdate, SortField, SortOrder


class DuplicateGameError(Exception):
    """Ja existe um jogo com o mesmo titulo (normalizado) naquela plataforma."""

    def __init__(self, title: str, platform: Platform) -> None:
        self.title = title
        self.platform = platform
        super().__init__(f"{title!r} ja cadastrado em {platform.value}")


def _find_duplicate(
    session: Session,
    *,
    title_normalized: str,
    platform: Platform,
    exclude_id: int | None = None,
) -> Game | None:
    query = select(Game).where(
        Game.title_normalized == title_normalized,
        Game.platform == platform,
    )
    if exclude_id is not None:
        query = query.where(Game.id != exclude_id)
    return session.exec(query).first()


def _apply_filters(
    query,
    *,
    status: GameStatus | None,
    platform: Platform | None,
    search: str | None,
):
    if status is not None:
        query = query.where(Game.status == status)
    if platform is not None:
        query = query.where(Game.platform == platform)
    if search:
        # Busca na coluna normalizada: "pokemon" encontra "Pokémon".
        query = query.where(col(Game.title_normalized).contains(normalize_title(search)))
    return query


def count_games(
    session: Session,
    *,
    status: GameStatus | None = None,
    platform: Platform | None = None,
    search: str | None = None,
) -> int:
    query = _apply_filters(
        select(func.count()).select_from(Game),
        status=status,
        platform=platform,
        search=search,
    )
    return session.exec(query).one()


def list_games(
    session: Session,
    *,
    status: GameStatus | None = None,
    platform: Platform | None = None,
    search: str | None = None,
    sort: SortField = SortField.CREATED_AT,
    order: SortOrder = SortOrder.DESC,
    skip: int = 0,
    limit: int = 20,
) -> list[Game]:
    query = _apply_filters(
        select(Game), status=status, platform=platform, search=search
    )

    sort_column = col(getattr(Game, sort.value))
    direction = sort_column.asc() if order is SortOrder.ASC else sort_column.desc()

    # id como criterio de desempate: sem uma ordem total, valores repetidos
    # fazem a paginacao repetir/pular registros entre as paginas.
    query = query.order_by(direction, col(Game.id).desc()).offset(skip).limit(limit)
    return list(session.exec(query).all())


def get_game(session: Session, game_id: int) -> Game | None:
    return session.get(Game, game_id)


def create_game(session: Session, payload: GameCreate) -> Game:
    data = payload.model_dump()
    title_normalized = normalize_title(data["title"])

    if _find_duplicate(
        session, title_normalized=title_normalized, platform=data["platform"]
    ):
        raise DuplicateGameError(data["title"], data["platform"])

    game = Game(**data)
    session.add(game)
    session.commit()
    session.refresh(game)
    return game


def update_game(session: Session, game: Game, payload: GameUpdate) -> Game:
    data = payload.model_dump(exclude_unset=True)

    # title e platform definem a unicidade; se qualquer um mudar, revalida.
    new_title = data.get("title", game.title)
    new_platform = data.get("platform", game.platform)
    title_normalized = normalize_title(new_title)

    if ("title" in data or "platform" in data) and _find_duplicate(
        session,
        title_normalized=title_normalized,
        platform=new_platform,
        exclude_id=game.id,
    ):
        raise DuplicateGameError(new_title, new_platform)

    for field, value in data.items():
        setattr(game, field, value)

    game.updated_at = datetime.now(UTC)
    session.add(game)
    session.commit()
    session.refresh(game)
    return game


def delete_game(session: Session, game: Game) -> None:
    session.delete(game)
    session.commit()
