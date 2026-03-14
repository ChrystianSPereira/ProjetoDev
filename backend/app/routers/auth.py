"""Authentication routes (login and current user profile)."""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..core.api_responses import DEFAULT_ERROR_RESPONSES
from ..core.config import ACCESS_TOKEN_EXPIRE_MINUTES
from ..core.security import create_access_token, get_password_hash, verify_password
from ..database import get_db
from ..dependencies.auth import get_current_user
from ..models.user import User
from ..schemas.auth import (
    AuthenticatedUserResponse,
    ChangePasswordRequest,
    MessageResponse,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"], responses=DEFAULT_ERROR_RESPONSES)


def _validate_new_password_strength(password: str) -> None:
    """Enforce minimal password complexity for secure credential rotation."""
    checks = [
        any(char.isupper() for char in password),
        any(char.islower() for char in password),
        any(char.isdigit() for char in password),
        any(not char.isalnum() for char in password),
    ]

    if not all(checks):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "A nova senha deve conter ao menos 1 letra maiuscula, "
                "1 minuscula, 1 numero e 1 caractere especial."
            ),
        )


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Authenticate by corporate email, user name, or email prefix and return JWT."""
    login_input = form_data.username.strip().lower()
    email_prefix_pattern = f"{login_input}@%"

    user = (
        db.query(User)
        .filter(
            or_(
                func.lower(User.email) == login_input,
                func.lower(User.name) == login_input,
                func.lower(User.email).like(email_prefix_pattern),
            )
        )
        .order_by(User.id.asc())
        .first()
    )

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais invalidas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=expires_delta
    )
    return TokenResponse(
        access_token=access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=AuthenticatedUserResponse)
def read_me(current_user: User = Depends(get_current_user)) -> User:
    """Return authenticated user profile from bearer token."""
    return current_user


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """Change current user's password with confirmation and complexity validation."""
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual invalida.",
        )

    if payload.new_password != payload.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A confirmacao da nova senha nao confere.",
        )

    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve ser diferente da senha atual.",
        )

    _validate_new_password_strength(payload.new_password)

    current_user.password_hash = get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()

    return MessageResponse(message="Senha atualizada com sucesso.")
