from contextlib import asynccontextmanager

from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import SessionDep
from app.routers.game import router as games_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # O schema e criado por migrations (`alembic upgrade head`), nao no boot.
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    # Sem isso o browser esconde o Location do 201 e o Content-Range do frontend.
    expose_headers=["Location"],
    allow_headers=["*"],
)


@app.get("/health")
def health(session: SessionDep, response: Response):
    """Verifica o banco: um health check que so retorna 200 engana orquestrador."""
    try:
        session.exec(text("SELECT 1"))
    except Exception:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unavailable", "database": "down"}
    return {"status": "ok", "database": "up"}


app.include_router(games_router)
