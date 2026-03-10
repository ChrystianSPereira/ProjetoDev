"""Authentication request/response schemas."""

from pydantic import BaseModel

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
