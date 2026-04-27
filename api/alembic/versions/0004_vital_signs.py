"""vital_signs table — P1a Patient Data Layer.

Revision ID: 0004_vital_signs
Revises: 0003_patients
Create Date: 2026-04-26

Hand-written (Principle II — no --autogenerate). Creates the vital_signs
table with FK patient_id → patients.id ON DELETE CASCADE and all nullable
measurement columns with CHECK constraints per data-model.md §Entity: VitalSigns.
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0004_vital_signs"
down_revision = "0003_patients"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vital_signs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "patient_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("patients.id", ondelete="CASCADE", name="fk_vital_signs_patient_id"),
            nullable=False,
        ),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("heart_rate", sa.Integer(), nullable=True),
        sa.Column("systolic_bp", sa.Integer(), nullable=True),
        sa.Column("diastolic_bp", sa.Integer(), nullable=True),
        sa.Column("temperature", sa.Numeric(precision=4, scale=1), nullable=True),
        sa.Column("spo2", sa.Integer(), nullable=True),
        sa.Column("respiratory_rate", sa.Integer(), nullable=True),
        sa.Column("gcs", sa.Integer(), nullable=True),
        sa.Column("urine_output", sa.Numeric(precision=7, scale=1), nullable=True),
        sa.Column("blood_sugar", sa.Numeric(precision=6, scale=1), nullable=True),
        sa.CheckConstraint(
            "heart_rate IS NULL OR (heart_rate >= 0 AND heart_rate <= 300)",
            name="ck_vital_signs_heart_rate",
        ),
        sa.CheckConstraint(
            "systolic_bp IS NULL OR (systolic_bp >= 0 AND systolic_bp <= 300)",
            name="ck_vital_signs_systolic_bp",
        ),
        sa.CheckConstraint(
            "diastolic_bp IS NULL OR (diastolic_bp >= 0 AND diastolic_bp <= 200)",
            name="ck_vital_signs_diastolic_bp",
        ),
        sa.CheckConstraint(
            "temperature IS NULL OR (temperature >= 30.0 AND temperature <= 45.0)",
            name="ck_vital_signs_temperature",
        ),
        sa.CheckConstraint(
            "spo2 IS NULL OR (spo2 >= 0 AND spo2 <= 100)",
            name="ck_vital_signs_spo2",
        ),
        sa.CheckConstraint(
            "respiratory_rate IS NULL OR (respiratory_rate >= 0 AND respiratory_rate <= 80)",
            name="ck_vital_signs_respiratory_rate",
        ),
        sa.CheckConstraint(
            "gcs IS NULL OR (gcs >= 3 AND gcs <= 15)",
            name="ck_vital_signs_gcs",
        ),
        sa.CheckConstraint(
            "urine_output IS NULL OR (urine_output >= 0 AND urine_output <= 5000)",
            name="ck_vital_signs_urine_output",
        ),
        sa.CheckConstraint(
            "blood_sugar IS NULL OR (blood_sugar >= 0 AND blood_sugar <= 1000)",
            name="ck_vital_signs_blood_sugar",
        ),
    )

    op.create_index(
        "ix_vital_signs_patient_recorded",
        "vital_signs",
        ["patient_id", sa.text("recorded_at ASC")],
    )


def downgrade() -> None:
    op.drop_index("ix_vital_signs_patient_recorded", table_name="vital_signs")
    op.drop_table("vital_signs")
