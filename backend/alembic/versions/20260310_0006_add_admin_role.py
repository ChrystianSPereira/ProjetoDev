"""add administrador role to user_role enum and promote admin user

Revision ID: 20260310_0006
Revises: 20260310_0005
Create Date: 2026-03-12 00:10:00
"""

from __future__ import annotations

import os
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260310_0006"
down_revision: Union[str, Sequence[str], None] = "20260310_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    admin_email = os.getenv("ADMIN_EMAIL", "admin@local.com")

    # PostgreSQL requires committing enum value creation before using the new value.
    with op.get_context().autocommit_block():
        op.execute(
            sa.text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_enum e
                        JOIN pg_type t ON t.oid = e.enumtypid
                        WHERE t.typname = 'user_role' AND e.enumlabel = 'ADMINISTRADOR'
                    ) THEN
                        ALTER TYPE user_role ADD VALUE 'ADMINISTRADOR';
                    END IF;
                END
                $$;
                """
            )
        )

    bind.execute(
        sa.text(
            """
            UPDATE users
            SET role = CAST('ADMINISTRADOR' AS user_role)
            WHERE email = :email
            """
        ),
        {"email": admin_email},
    )


def downgrade() -> None:
    bind = op.get_bind()
    admin_email = os.getenv("ADMIN_EMAIL", "admin@local.com")

    bind.execute(
        sa.text(
            """
            UPDATE users
            SET role = CAST('COORDENADOR' AS user_role)
            WHERE email = :email
            """
        ),
        {"email": admin_email},
    )
