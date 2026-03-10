"""FastAPI entrypoint for the document management backend."""

from fastapi import FastAPI
from sqlalchemy import text

from .database import engine
from .routers.auth import router as auth_router

app = FastAPI(
    title="Sistema de Gestao Documental",
    version="0.1.0",
    description="API REST para gerenciamento documental com controle de ciclo de vida.",
)


@app.get("/")
def root() -> dict[str, str]:
    return {"status": "API funcionando"}


@app.get("/health/db")
def health_db() -> dict[str, str]:
    """Validate DB reachability to simplify diagnostics in local/dev/prod."""
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok"}


app.include_router(auth_router)
