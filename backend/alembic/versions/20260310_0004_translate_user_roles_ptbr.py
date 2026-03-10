"""translate user roles to portuguese

Revision ID: 20260310_0004
Revises: 20260310_0003
Create Date: 2026-03-10 00:30:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260310_0004"
down_revision: Union[str, Sequence[str], None] = "20260310_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    bind.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'user_role' AND e.enumlabel = 'AUTHOR'
                ) THEN
                    ALTER TYPE user_role RENAME VALUE 'AUTHOR' TO 'AUTOR';
                END IF;
            END
            $$;
            """
        )
    )

    bind.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'user_role' AND e.enumlabel = 'COORDINATOR'
                ) THEN
                    ALTER TYPE user_role RENAME VALUE 'COORDINATOR' TO 'COORDENADOR';
                END IF;
            END
            $$;
            """
        )
    )

    bind.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'user_role' AND e.enumlabel = 'READER'
                ) THEN
                    ALTER TYPE user_role RENAME VALUE 'READER' TO 'LEITOR';
                END IF;
            END
            $$;
            """
        )
    )


def downgrade() -> None:
    bind = op.get_bind()

    bind.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'user_role' AND e.enumlabel = 'AUTOR'
                ) THEN
                    ALTER TYPE user_role RENAME VALUE 'AUTOR' TO 'AUTHOR';
                END IF;
            END
            $$;
            """
        )
    )

    bind.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'user_role' AND e.enumlabel = 'COORDENADOR'
                ) THEN
                    ALTER TYPE user_role RENAME VALUE 'COORDENADOR' TO 'COORDINATOR';
                END IF;
            END
            $$;
            """
        )
    )

    bind.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'user_role' AND e.enumlabel = 'LEITOR'
                ) THEN
                    ALTER TYPE user_role RENAME VALUE 'LEITOR' TO 'READER';
                END IF;
            END
            $$;
            """
        )
    )
