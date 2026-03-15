"""make audit logs immutable

Revision ID: 20260314_0007
Revises: 20260310_0006
Create Date: 2026-03-14 00:00:00
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260314_0007"
down_revision: Union[str, Sequence[str], None] = "20260310_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            CREATE OR REPLACE FUNCTION prevent_audit_logs_mutation()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                RAISE EXCEPTION 'audit_logs e imutavel; operacao % nao permitida', TG_OP
                    USING ERRCODE = '55000';
            END;
            $$;
            """
        )
    )

    op.execute(
        sa.text(
            """
            DROP TRIGGER IF EXISTS trg_prevent_audit_logs_update ON audit_logs;
            CREATE TRIGGER trg_prevent_audit_logs_update
            BEFORE UPDATE ON audit_logs
            FOR EACH ROW
            EXECUTE FUNCTION prevent_audit_logs_mutation();
            """
        )
    )

    op.execute(
        sa.text(
            """
            DROP TRIGGER IF EXISTS trg_prevent_audit_logs_delete ON audit_logs;
            CREATE TRIGGER trg_prevent_audit_logs_delete
            BEFORE DELETE ON audit_logs
            FOR EACH ROW
            EXECUTE FUNCTION prevent_audit_logs_mutation();
            """
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DROP TRIGGER IF EXISTS trg_prevent_audit_logs_update ON audit_logs;"))
    op.execute(sa.text("DROP TRIGGER IF EXISTS trg_prevent_audit_logs_delete ON audit_logs;"))
    op.execute(sa.text("DROP FUNCTION IF EXISTS prevent_audit_logs_mutation();"))