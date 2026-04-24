"""shadow_events table — MEP hinge for Shadow-First deployment (Principles XIII, XIV).

Table is INERT in P0; no writers exist. Hand-written (no --autogenerate).

Revision ID: 0002_shadow_events
Revises: 0001_users
Create Date: 2026-04-24
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0002_shadow_events"
down_revision = "0001_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "shadow_events",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "shift_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "ho_user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column(
            "payload",
            sa.dialects.postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("divergence_score", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(
            ["ho_user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
    )

    op.execute(
        "CREATE INDEX ix_shadow_events_ho_user_id_created_at"
        " ON shadow_events (ho_user_id, created_at DESC)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_shadow_events_ho_user_id_created_at")
    op.drop_table("shadow_events")
