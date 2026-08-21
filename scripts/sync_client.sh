#!/usr/bin/env bash
# Regenera o client TypeScript a partir do codigo da API.
# Rode sempre que mexer em rotas ou schemas do backend.
set -euo pipefail
cd "$(dirname "$0")/.."

(cd backend && uv run python scripts/export_openapi.py)
(cd frontend && npm run generate && npm run typecheck)
echo "Client sincronizado."
