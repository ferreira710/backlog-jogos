# backend

API REST do backlog de jogos — FastAPI + SQLModel.
Parte do monorepo; veja o [README raiz](../README.md).

## Setup

```bash
uv sync
uv run alembic upgrade head
uv run fastapi dev app/main.py
```

Docs interativas em http://127.0.0.1:8000/docs

## Endpoints

| Método   | Rota           | Notas                                          |
| -------- | -------------- | ---------------------------------------------- |
| `GET`    | `/health`      | Verifica o banco; `503` se estiver fora        |
| `GET`    | `/games`       | Envelope paginado (ver abaixo)                 |
| `POST`   | `/games`       | `201`, ou `409` se já existe na plataforma     |
| `GET`    | `/games/{id}`  | `404` se não existe                            |
| `PATCH`  | `/games/{id}`  | Parcial; `409` em colisão de título/plataforma |
| `DELETE` | `/games/{id}`  | `204`                                          |

### `GET /games`

Query params: `status`, `platform`, `search`, `sort`
(`created_at` \| `updated_at` \| `title` \| `rating` \| `hours_played`),
`order` (`asc` \| `desc`), `skip`, `limit` (1–100).

`search` ignora maiúsculas e acentos — `pokemon` encontra `Pokémon`.

A resposta é um envelope, não um array — `total` é o que permite montar a
paginação no frontend:

```json
{ "items": [ /* ... */ ], "total": 42, "skip": 0, "limit": 20 }
```

## Consumindo pelo Vite

As portas do Vite (`5173` dev e `4173` preview) já vêm liberadas no CORS. Para
outras origens, use `CORS_ORIGINS` no `.env`.

Um jogo é único por (título, plataforma), comparando sem acentos nem
maiúsculas. Trate o `409` na UI — é o caso de "esse jogo já está no backlog".

## Banco de dados

O schema é gerenciado por migrations (Alembic). **A aplicação não cria tabelas no
boot** — rode `uv run alembic upgrade head` antes de subir.

Ao alterar `app/models/`:

```bash
uv run alembic revision --autogenerate -m "descricao da mudanca"
uv run alembic upgrade head
```

O teste `tests/test_schema.py::test_migrations_match_models` falha se os models
mudarem sem a migration correspondente.

## Client TypeScript

O client tipado vive em `frontend/src/api/`, gerado a partir de `openapi.json`.
Depois de mexer em rotas ou schemas, regenere:

```bash
../scripts/sync_client.sh
```

## Testes e lint

```bash
uv run pytest
uv run ruff check .
```

## Configuração

Copie `.env.example` para `.env`. Variáveis em `app/core/config.py`:

| Variável       | Default                     | Descrição                     |
| -------------- | --------------------------- | ----------------------------- |
| `APP_NAME`     | `API CRUD`                  | Título exibido no OpenAPI     |
| `DATABASE_URL` | `sqlite:///./app.db`        | URL do banco                  |
| `SQL_ECHO`     | `false`                     | Loga todo o SQL emitido       |
| `CORS_ORIGINS` | portas do Vite em localhost | Origens permitidas (CSV)      |
