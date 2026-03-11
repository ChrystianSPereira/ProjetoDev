"""Shared OpenAPI response definitions."""

from ..schemas.common import ErrorResponse

DEFAULT_ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Requisicao invalida"},
    401: {"model": ErrorResponse, "description": "Nao autenticado"},
    403: {"model": ErrorResponse, "description": "Sem permissao"},
    404: {"model": ErrorResponse, "description": "Recurso nao encontrado"},
    409: {"model": ErrorResponse, "description": "Conflito de regra de negocio"},
    422: {"model": ErrorResponse, "description": "Erro de validacao"},
    500: {"model": ErrorResponse, "description": "Erro interno"},
}
