"""Common API response schemas."""

from datetime import datetime

from pydantic import BaseModel


class ApiStatusResponse(BaseModel):
    status: str


class ErrorResponse(BaseModel):
    status_code: int
    error: str
    message: str
    path: str
    timestamp: datetime
    details: list[dict] | dict | None = None

