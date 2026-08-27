import unicodedata
from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, UniqueConstraint, event
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(UTC)


def normalize_title(title: str) -> str:
    """Chave de comparacao: sem acento, minuscula, espacos colapsados.

    Feito em Python (e nao com NOCASE/citext) para valer igual em SQLite e
    Postgres — NOCASE do SQLite so cobre ASCII e erraria em "Pokemon"/"Pokémon".
    """
    decomposed = unicodedata.normalize("NFKD", title)
    without_accents = "".join(c for c in decomposed if not unicodedata.combining(c))
    return " ".join(without_accents.casefold().split())


class GameStatus(StrEnum):
    BACKLOG = "backlog"
    PLAYING = "playing"
    FINISHED = "finished"
    ABANDONED = "abandoned"


class Platform(StrEnum):
    PC = "pc"
    PLAYSTATION = "playstation"
    XBOX = "xbox"
    NINTENDO = "nintendo"
    MOBILE = "mobile"


class Game(SQLModel, table=True):
    # SQLModel ignora ge/le em modelos com table=True: quem valida e o schema
    # Pydantic. Estas constraints sao a garantia real, valida para qualquer
    # caminho de escrita (service, shell, script de carga).
    __table_args__ = (
        CheckConstraint(
            "rating IS NULL OR (rating >= 0 AND rating <= 10)",
            name="ck_game_rating_range",
        ),
        CheckConstraint("hours_played >= 0", name="ck_game_hours_played_non_negative"),
        CheckConstraint("length(trim(title)) > 0", name="ck_game_title_not_empty"),
        UniqueConstraint("title_normalized", "platform", name="uq_game_title_platform"),
    )

    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(index=True, max_length=120)
    # Coluna derivada de `title` (ver _sync_title_normalized). Serve a dois
    # propositos: a unicidade case/acento-insensitive e a busca por trecho.
    title_normalized: str = Field(default="", max_length=120)
    platform: Platform
    status: GameStatus = Field(default=GameStatus.BACKLOG, index=True)
    rating: int | None = Field(default=None, ge=0, le=10)
    hours_played: float = Field(default=0, ge=0)
    cover_image_url: str | None = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=utcnow)
    # onupdate garante o carimbo mesmo se algum caminho de escrita esquecer de setar.
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_column_kwargs={"onupdate": utcnow},
    )


@event.listens_for(Game, "before_insert")
@event.listens_for(Game, "before_update")
def _sync_title_normalized(_mapper, _connection, target: Game) -> None:
    """Deriva title_normalized de title em toda escrita.

    Feito no flush, e nao no __init__ nem no service: o default do campo seria
    aplicado depois e sobrescreveria o valor, e deixar a cargo do service faria
    de `Game(title=...)` em qualquer script uma violacao de NOT NULL.
    """
    target.title_normalized = normalize_title(target.title)
