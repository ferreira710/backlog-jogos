"""Settings lidas de variavel de ambiente.

Existe porque o parsing de CORS_ORIGINS quebrou em producao (container) sem
falhar em nenhum teste: a suite so exercitava o valor default, nunca a env var.
"""

import pytest

from app.core.config import Settings


def build(monkeypatch: pytest.MonkeyPatch, **env: str) -> Settings:
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    # _env_file=None isola do .env da maquina de quem roda os testes.
    return Settings(_env_file=None)


def test_defaults_without_env(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    settings = build(monkeypatch)

    assert settings.database_url == "sqlite:///./app.db"
    assert settings.sql_echo is False
    assert "http://localhost:5173" in settings.cors_origins


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("http://localhost:5173", ["http://localhost:5173"]),
        ("http://a.com,http://b.com", ["http://a.com", "http://b.com"]),
        ("http://a.com, http://b.com ", ["http://a.com", "http://b.com"]),
        ('["http://a.com","http://b.com"]', ["http://a.com", "http://b.com"]),
        ("", []),
    ],
)
def test_cors_origins_accepts_csv_and_json(monkeypatch, raw, expected):
    assert build(monkeypatch, CORS_ORIGINS=raw).cors_origins == expected


def test_compose_environment_boots(monkeypatch):
    """Exatamente o que docker-compose.yml injeta no service backend."""
    settings = build(
        monkeypatch,
        DATABASE_URL="sqlite:////data/app.db",
        CORS_ORIGINS="http://localhost:5173",
    )

    assert settings.database_url == "sqlite:////data/app.db"
    assert settings.cors_origins == ["http://localhost:5173"]


def test_sql_echo_from_env(monkeypatch):
    assert build(monkeypatch, SQL_ECHO="true").sql_echo is True
