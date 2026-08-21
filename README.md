# api-crud

Backlog de jogos — monorepo com API em FastAPI e frontend em React + Vite.

```
backend/    FastAPI + SQLModel + Alembic
frontend/   Vite + React + TypeScript (client da API em src/api/)
scripts/    sync_client.sh — regenera o client a partir do OpenAPI
```

## Subir com Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- API: http://localhost:8000 · docs em http://localhost:8000/docs

O backend roda as migrations no start e o frontend só sobe depois do
healthcheck da API passar. O banco fica no volume `backend-data`.

Com hot reload nos dois containers:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Rodar sem Docker

```bash
# backend
cd backend && uv sync && uv run alembic upgrade head && uv run fastapi dev app/main.py

# frontend (outro terminal)
cd frontend && npm install && npm run dev
```

As portas do Vite já vêm liberadas no CORS do backend.

## Depois de mexer na API

O client TypeScript é gerado do OpenAPI — não edite `frontend/src/api/schema.d.ts`
à mão:

```bash
./scripts/sync_client.sh
```

`backend/tests/test_schema.py::test_exported_openapi_is_up_to_date` falha se a
API mudar e o spec não for reexportado.

## Verificações

```bash
cd backend  && uv run pytest && uv run ruff check .
cd frontend && npm test && npm run typecheck && npm run build
```

## Detalhes

Cada pasta tem seu README: [backend](backend/README.md) · [frontend](frontend/README.md)
