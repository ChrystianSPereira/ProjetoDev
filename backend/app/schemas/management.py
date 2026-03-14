"""Schemas for support management endpoints."""

from pydantic import BaseModel, Field

from ..models.enums import UserRole


class SectorCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class SectorResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class SectorUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class DocumentTypeCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class DocumentTypeResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class UserCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=6, max_length=128)
    role: UserRole
    sector_id: int | None = None


class UserUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: str | None = Field(default=None, min_length=5, max_length=255)
    password: str | None = Field(default=None, min_length=6, max_length=128)
    role: UserRole | None = None
    sector_id: int | None = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    sector_id: int

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    skip: int
    limit: int
