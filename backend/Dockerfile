FROM python:3.14-slim

# uv vem da imagem oficial: mais rapido e reproduzivel que instalar via pip.
COPY --from=ghcr.io/astral-sh/uv:0.12.5 /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/usr/local

WORKDIR /app

# Dependencias antes do codigo: mexer no app nao invalida esta camada.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY . .
RUN uv sync --frozen --no-dev

# Nao roda como root.
RUN useradd --create-home --uid 1000 app \
    && mkdir -p /data && chown -R app:app /data /app
USER app

# O banco fica no volume, nao na camada da imagem.
ENV DATABASE_URL=sqlite:////data/app.db

EXPOSE 8000
# Migrations antes de servir: o app nao cria tabelas no boot.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
