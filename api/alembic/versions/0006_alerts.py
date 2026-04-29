"""alerts table — P1b Alert Engine + Clinical Protocols.

Revision ID: 0006_alerts
Revises: 0005_lab_results
Create Date: 2026-04-29

Hand-written (Principle II — no --autogenerate). Creates the alerts table
with FKs to patients (CASCADE) and users (SET NULL for acknowledged_by).
Two composite indexes support the primary query patterns.
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0006_alerts"
down_revision = "0005_lab_results"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "alerts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("alert_type", sa.String(10), nullable=False),
        sa.Column("trigger_source", sa.String(10), nullable=False),
        sa.Column("trigger_parameter", sa.String(50), nullable=False),
        sa.Column("trigger_value", sa.Float(), nullable=False),
        sa.Column("message", sa.String(500), nullable=False),
        sa.Column("protocol_link", sa.String(200), nullable=True),
        sa.Column("acknowledged", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("acknowledged_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["patients.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["acknowledged_by"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_alerts_patient_id_created_at",
        "alerts",
        ["patient_id", sa.text("created_at DESC")],
    )
    op.create_index(
        "ix_alerts_patient_id_acknowledged",
        "alerts",
        ["patient_id", "acknowledged"],
    )


def downgrade() -> None:
    op.drop_index("ix_alerts_patient_id_acknowledged", table_name="alerts")
    op.drop_index("ix_alerts_patient_id_created_at", table_name="alerts")
    op.drop_table("alerts")
