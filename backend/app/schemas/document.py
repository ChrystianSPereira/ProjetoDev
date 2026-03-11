"""Document lifecycle request/response schemas."""

from datetime import date, datetime

from pydantic import BaseModel, Field

from ..models.enums import DocumentScope, DocumentStatus


class DocumentDraftCreateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=255)
    scope: DocumentScope
    sector_id: int
    document_type_id: int
    expiration_date: date
    file_uri: str = Field(min_length=1, max_length=500)


class DocumentDecisionRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=2000)


class DocumentVersionResponse(BaseModel):
    id: int
    document_id: int
    version_number: int
    status: DocumentStatus
    file_uri: str
    expiration_date: date
    created_by_user_id: int
    approved_by_user_id: int | None
    created_at: datetime
    submitted_at: datetime | None
    approved_at: datetime | None
    rejection_reason: str | None

    model_config = {"from_attributes": True}


class DocumentSearchItemResponse(BaseModel):
    document_id: int
    code: str
    title: str
    scope: DocumentScope
    sector_id: int
    document_type_id: int
    version_id: int
    version_number: int
    status: DocumentStatus
    expiration_date: date
    file_uri: str
    approved_at: datetime | None


class DocumentSearchResponse(BaseModel):
    items: list[DocumentSearchItemResponse]
    total: int
    skip: int
    limit: int
