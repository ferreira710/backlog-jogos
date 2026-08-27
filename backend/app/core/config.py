import json
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    app_name: str = "API CRUD"
    database_url: str = "sqlite:///./app.db"
    sql_echo: bool = False

    # Usada para buscar nome + capa de jogos na RAWG (rawg.io/apidocs).
    # Vazia = busca externa desabilitada (endpoint responde 503).
    rawg_api_key: str = ""
    rawg_base_url: str = "https://api.rawg.io/api"

    # NoDecode desliga o json.loads() que o pydantic-settings aplica a campos
    # complexos ANTES dos validators — sem isso, "http://a,http://b" nunca
    # chega no split_origins abaixo e a app morre no boot.
    # Portas padrao do Vite: 5173 (dev) e 4173 (preview).
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        # Aceita CSV ("http://a,http://b") e JSON ('["http://a"]').
        if not isinstance(value, str):
            return value
        stripped = value.strip()
        if stripped.startswith("["):
            return json.loads(stripped)
        return [origin.strip() for origin in stripped.split(",") if origin.strip()]


settings = Settings()
