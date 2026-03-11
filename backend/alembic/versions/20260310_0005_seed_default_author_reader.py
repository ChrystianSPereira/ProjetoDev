"""seed default author and reader users

Revision ID: 20260310_0005
Revises: 20260310_0004
Create Date: 2026-03-10 00:40:00
"""

from __future__ import annotations

import os
from typing import Sequence, Union

import bcrypt
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260310_0005"
down_revision: Union[str, Sequence[str], None] = "20260310_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _upsert_user(bind, *, name: str, email: str, password: str, role: str, sector_id: int) -> None:
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    bind.execute(
        sa.text(
            """
            INSERT INTO users (name, email, password_hash, role, sector_id)
            VALUES (:name, :email, :password_hash, CAST(:role AS user_role), :sector_id)
            ON CONFLICT (email) DO NOTHING
            """
        ),
        {
            "name": name,
            "email": email,
            "password_hash": password_hash,
            "role": role,
            "sector_id": sector_id,
        },
    )


def upgrade() -> None:
    bind = op.get_bind()

    default_sector_name = os.getenv("ADMIN_SECTOR_NAME", "Administracao")
    sector_id = bind.execute(
        sa.text("SELECT id FROM sectors WHERE name = :name"),
        {"name": default_sector_name},
    ).scalar()

    if sector_id is None:
        sector_id = bind.execute(
            sa.text("INSERT INTO sectors (name) VALUES (:name) RETURNING id"),
            {"name": default_sector_name},
        ).scalar_one()

    _upsert_user(
        bind,
        name=os.getenv("AUTHOR_NAME", "Autor Padrao"),
        email=os.getenv("AUTHOR_EMAIL", "autor@local.com"),
        password=os.getenv("AUTHOR_PASSWORD", "Autor@123"),
        role="AUTOR",
        sector_id=sector_id,
    )

    _upsert_user(
        bind,
        name=os.getenv("READER_NAME", "Leitor Padrao"),
        email=os.getenv("READER_EMAIL", "leitor@local.com"),
        password=os.getenv("READER_PASSWORD", "Leitor@123"),
        role="LEITOR",
        sector_id=sector_id,
    )


def downgrade() -> None:
    bind = op.get_bind()

    bind.execute(
        sa.text("DELETE FROM users WHERE email = :email"),
        {"email": os.getenv("AUTHOR_EMAIL", "autor@local.com")},
    )
    bind.execute(
        sa.text("DELETE FROM users WHERE email = :email"),
        {"email": os.getenv("READER_EMAIL", "leitor@local.com")},
    )
