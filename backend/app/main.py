"""FastAPI entrypoint for the document management backend."""

from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .core.api_responses import DEFAULT_ERROR_RESPONSES
from .database import engine
from .routers.audit import router as audit_router
from .routers.auth import router as auth_router
from .routers.documents import router as documents_router
from .routers.management import router as management_router
from .schemas.common import ApiStatusResponse, ErrorResponse

app = FastAPI(
    title="Sistema de Gestao Documental",
    version="0.1.0",
    description="API REST para gerenciamento documental com controle de ciclo de vida.",
)


def _error_payload(
    *,
    status_code: int,
    error: str,
    message: str,
    path: str,
    details: list[dict] | dict | None = None,
) -> dict:
    return ErrorResponse(
        status_code=status_code,
        error=error,
        message=message,
        path=path,
        timestamp=datetime.now(UTC),
        details=details,
    ).model_dump(mode="json")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    payload = _error_payload(
        status_code=exc.status_code,
        error="HTTP_ERROR",
        message=str(exc.detail),
        path=str(request.url.path),
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=payload,
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    payload = _error_payload(
        status_code=422,
        error="VALIDATION_ERROR",
        message="Dados de entrada invalidos.",
        path=str(request.url.path),
        details=exc.errors(),
    )
    return JSONResponse(status_code=422, content=payload)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, _: Exception):
    payload = _error_payload(
        status_code=500,
        error="INTERNAL_SERVER_ERROR",
        message="Erro interno nao tratado.",
        path=str(request.url.path),
    )
    return JSONResponse(status_code=500, content=payload)


@app.get("/", response_model=ApiStatusResponse, responses=DEFAULT_ERROR_RESPONSES)
def root() -> ApiStatusResponse:
    return ApiStatusResponse(status="API funcionando")


@app.get("/health/db", response_model=ApiStatusResponse, responses=DEFAULT_ERROR_RESPONSES)
def health_db() -> ApiStatusResponse:
    """Validate DB reachability to simplify diagnostics in local/dev/prod."""
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return ApiStatusResponse(status="ok")


app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(management_router)
app.include_router(audit_router)
