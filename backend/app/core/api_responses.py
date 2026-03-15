"""Shared OpenAPI response definitions."""

from ..schemas.common import ErrorResponse

DEFAULT_ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Requisicao invalida"},
    401: {"model": ErrorResponse, "description": "Não autenticado"},
    403: {"model": ErrorResponse, "description": "Sem permissão"},
    404: {"model": ErrorResponse, "description": "Recurso não encontrado"},
    409: {"model": ErrorResponse, "description": "Conflito de regra de negocio"},
    422: {"model": ErrorResponse, "description": "Erro de validação"},
    500: {"model": ErrorResponse, "description": "Erro interno"},
}

