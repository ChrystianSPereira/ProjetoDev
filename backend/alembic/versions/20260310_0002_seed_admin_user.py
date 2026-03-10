"""seed default admin user

Revision ID: 20260310_0002
Revises: 20260310_0001
Create Date: 2026-03-10 00:10:00
"""

from __future__ import annotations

import os
from typing import Sequence, Union

import bcrypt
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260310_0002"
down_revision: Union[str, Sequence[str], None] = "20260310_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create a default coordinator/admin user if it does not exist."""
    bind = op.get_bind()

    admin_sector_name = os.getenv("ADMIN_SECTOR_NAME", "Administracao")
    admin_name = os.getenv("ADMIN_NAME", "Administrador")
    admin_email = os.getenv("ADMIN_EMAIL", "admin@local.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "Admin@123")

    sector_id = bind.execute(
        sa.text("SELECT id FROM sectors WHERE name = :name"),
        {"name": admin_sector_name},
    ).scalar()

    if sector_id is None:
        sector_id = bind.execute(
            sa.text("INSERT INTO sectors (name) VALUES (:name) RETURNING id"),
            {"name": admin_sector_name},
        ).scalar_one()

    user_id = bind.execute(
        sa.text("SELECT id FROM users WHERE email = :email"),
        {"email": admin_email},
    ).scalar()

    if user_id is None:
        password_hash = bcrypt.hashpw(
            admin_password.encode("utf-8"),
            bcrypt.gensalt(),
        ).decode("utf-8")

        bind.execute(
            sa.text(
                """
                INSERT INTO users (name, email, password_hash, role, sector_id)
                VALUES (:name, :email, :password_hash, :role, :sector_id)
                """
            ),
            {
                "name": admin_name,
                "email": admin_email,
                "password_hash": password_hash,
                "role": "COORDENADOR",
                "sector_id": sector_id,
            },
        )


def downgrade() -> None:
    """Remove seeded admin user by configured/default email."""
    bind = op.get_bind()
    admin_email = os.getenv("ADMIN_EMAIL", "admin@local.com")

    bind.execute(
        sa.text("DELETE FROM users WHERE email = :email"),
        {"email": admin_email},
    )
