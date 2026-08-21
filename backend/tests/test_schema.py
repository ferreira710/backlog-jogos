"""Garante que migrations e models nao divirjam, e que as constraints valem no banco."""

from pathlib import Path

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy.exc import IntegrityError
from sqlmodel import SQLModel, create_engine

from app.models.game import Game, Platform

ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"


def test_migrations_match_models(tmp_path):
    """`alembic upgrade head` precisa produzir exatamente o schema dos models.

    Sem isso, alterar um model e esquecer a migration passa despercebido ate
    quebrar em producao.
    """
    url = f"sqlite:///{tmp_path / 'drift.db'}"
    config = Config(str(ALEMBIC_INI))
    config.set_main_option("script_location", str(ALEMBIC_INI.parent / "migrations"))
    config.set_main_option("sqlalchemy.url", url)

    command.upgrade(config, "head")

    engine = create_engine(url)
    with engine.connect() as connection:
        diff = compare_metadata(MigrationContext.configure(connection), SQLModel.metadata)

    assert diff == [], f"models e migrations divergiram: {diff}"


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("rating", 11),
        ("rating", -1),
        ("hours_played", -0.5),
        ("title", "   "),
    ],
)
def test_check_constraints_reject_invalid_writes(session, field, value):
    """As constraints protegem escritas que nao passam pelos schemas Pydantic."""
    attrs = {"title": "Celeste", "platform": Platform.PC, field: value}
    session.add(Game(**attrs))

    with pytest.raises(IntegrityError):
        session.commit()

    session.rollback()


def test_check_constraints_allow_valid_writes(session):
    session.add(Game(title="Celeste", platform=Platform.PC, rating=10, hours_played=0))
    session.commit()

    session.add(Game(title="Braid", platform=Platform.PC, rating=None))
    session.commit()


def test_title_normalized_is_derived_on_write(session):
    """Construir Game direto (script, shell) tem de preencher title_normalized."""
    game = Game(title="  Pokémon   Scarlet ", platform=Platform.NINTENDO)
    session.add(game)
    session.commit()
    session.refresh(game)

    assert game.title_normalized == "pokemon scarlet"

    game.title = "Pokémon Violet"
    session.commit()
    session.refresh(game)

    assert game.title_normalized == "pokemon violet"


def test_exported_openapi_is_up_to_date():
    """backend/openapi.json precisa refletir a API atual.

    O client TypeScript e gerado desse arquivo; se ele ficar para tras, o
    frontend compila contra um contrato que nao existe mais.
    Para corrigir: `../scripts/sync_client.sh`
    """
    import json

    from app.main import app

    exported = Path(__file__).resolve().parent.parent / "openapi.json"
    assert exported.exists(), "rode ../scripts/sync_client.sh"

    assert json.loads(exported.read_text()) == app.openapi(), (
        "backend/openapi.json esta desatualizado — rode ./scripts/sync_client.sh"
    )
