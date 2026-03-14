"""Authentication request/response schemas."""

from pydantic import BaseModel, Field

from ..models.enums import UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthenticatedUserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    sector_id: int

    model_config = {"from_attributes": True}


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8)
    confirm_new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str
