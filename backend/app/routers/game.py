from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.core.database import SessionDep
from app.models.game import Game, GameStatus, Platform
from app.schemas.game import (
    GameCreate,
    GamePage,
    GameRead,
    GameUpdate,
    SortField,
    SortOrder,
)
from app.services import game as game_service
from app.services.game import DuplicateGameError

router = APIRouter(prefix="/games", tags=["games"])


def _get_or_404(session: SessionDep, game_id: int) -> Game:
    game = game_service.get_game(session, game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    return game


@router.get("", response_model=GamePage)
def list_games(
    session: SessionDep,
    status_filter: Annotated[GameStatus | None, Query(alias="status")] = None,
    platform: Annotated[Platform | None, Query()] = None,
    search: Annotated[str | None, Query(max_length=120)] = None,
    sort: Annotated[SortField, Query()] = SortField.CREATED_AT,
    order: Annotated[SortOrder, Query()] = SortOrder.DESC,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    filters = {"status": status_filter, "platform": platform, "search": search}
    items = game_service.list_games(
        session, sort=sort, order=order, skip=skip, limit=limit, **filters
    )
    return GamePage(
        items=[GameRead.model_validate(game) for game in items],
        total=game_service.count_games(session, **filters),
        skip=skip,
        limit=limit,
    )


@router.get("/{game_id}", response_model=GameRead)
def get_game(game_id: int, session: SessionDep):
    return _get_or_404(session, game_id)


@router.post(
    "",
    response_model=GameRead,
    status_code=status.HTTP_201_CREATED,
    responses={409: {"description": "Jogo já cadastrado nessa plataforma"}},
)
def create_game(payload: GameCreate, session: SessionDep):
    try:
        return game_service.create_game(session, payload)
    except DuplicateGameError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.patch(
    "/{game_id}",
    response_model=GameRead,
    responses={409: {"description": "Jogo já cadastrado nessa plataforma"}},
)
def update_game(game_id: int, payload: GameUpdate, session: SessionDep):
    game = _get_or_404(session, game_id)
    try:
        return game_service.update_game(session, game, payload)
    except DuplicateGameError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.delete("/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_game(game_id: int, session: SessionDep):
    game = _get_or_404(session, game_id)
    game_service.delete_game(session, game)
