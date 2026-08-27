from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.models.game import GameStatus, Platform


class SortField(StrEnum):
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    TITLE = "title"
    RATING = "rating"
    HOURS_PLAYED = "hours_played"


class SortOrder(StrEnum):
    ASC = "asc"
    DESC = "desc"


class GameCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    platform: Platform
    status: GameStatus = GameStatus.BACKLOG
    rating: int | None = Field(default=None, ge=0, le=10)
    hours_played: float = Field(default=0, ge=0)
    cover_image_url: str | None = Field(default=None, max_length=500)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("title nao pode ser vazio")
        return stripped


class GameUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    platform: Platform | None = None
    status: GameStatus | None = None
    rating: int | None = Field(default=None, ge=0, le=10)
    hours_played: float | None = Field(default=None, ge=0)
    # None explicito e valido aqui (diferente dos campos NOT NULL abaixo):
    # e como o formulario limpa uma capa escolhida por engano.
    cover_image_url: str | None = Field(default=None, max_length=500)

    # None aqui significa "campo ausente". Enviar null explicito nestes campos
    # gravaria NULL em coluna NOT NULL, entao vira 422 em vez de 500.
    @field_validator("title", "platform", "status", "hours_played", mode="before")
    @classmethod
    def reject_explicit_null(cls, value: Any) -> Any:
        if value is None:
            raise ValueError("campo nao aceita null; omita-o para nao alterar")
        return value

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("title nao pode ser vazio")
        return stripped


class GameRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    platform: Platform
    status: GameStatus
    rating: int | None
    hours_played: float
    cover_image_url: str | None
    created_at: datetime
    updated_at: datetime

    # SQLite descarta o offset, entao os datetimes voltam naive do banco.
    # Reanexamos UTC para o cliente nao precisar adivinhar o fuso.
    @field_serializer("created_at", "updated_at")
    def as_utc(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)


class ExternalGameResult(BaseModel):
    """Um resultado da busca de capas no catalogo externo (RAWG)."""

    external_id: int
    name: str
    released: str | None = None
    cover_image_url: str | None = None


class GamePage(BaseModel):
    """Envelope de listagem: sem `total` o frontend nao consegue paginar."""

    items: list[GameRead]
    total: int
    skip: int
    limit: int
