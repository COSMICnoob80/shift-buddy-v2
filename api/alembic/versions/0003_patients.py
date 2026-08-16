"""patients table + 4 enum types — P1a Patient Data Layer.

Revision ID: 0003_patients
Revises: 0002_shadow_events
Create Date: 2026-04-26

Hand-written (Principle II — no --autogenerate). Creates patient_sex,
patient_acuity, patient_ward, patient_status enum types and the patients
table with all columns per data-model.md §Entity: Patient. Full downgrade.
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0003_patients"
down_revision = "0002_shadow_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Enum types ─────────────────────────────────────────────────────────────
    sa.Enum("male", "female", name="patient_sex").create(op.get_bind(), checkfirst=False)
    sa.Enum("critical", "urgent", "stable", "discharge_ready", name="patient_acuity").create(
        op.get_bind(), checkfirst=False
    )
    sa.Enum(
        "ortho",
        "surgical_itc",
        "family",
        "officer",
        "child",
        "emergency",
        name="patient_ward",
    ).create(op.get_bind(), checkfirst=False)
    sa.Enum("admitted", "discharged", "transferred", "expired", name="patient_status").create(
        op.get_bind(), checkfirst=False
    )

    # ── patients table ─────────────────────────────────────────────────────────
    op.create_table(
        "patients",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "bed_number",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            "name",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "age",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "sex",
            sa.Enum(name="patient_sex", create_type=False),
            nullable=False,
        ),
        sa.Column("rank_title", sa.String(length=100), nullable=True),
        sa.Column(
            "date_of_admission",
            sa.Date(),
            nullable=False,
        ),
        sa.Column(
            "provisional_diagnosis",
            sa.String(length=500),
            nullable=False,
        ),
        sa.Column(
            "active_problems",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "current_medications",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "allergies",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "acuity",
            sa.Enum(name="patient_acuity", create_type=False),
            nullable=False,
            server_default=sa.text("'stable'"),
        ),
        sa.Column(
            "ward",
            sa.Enum(name="patient_ward", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "assigned_ho",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT", name="fk_patients_assigned_ho"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(name="patient_status", create_type=False),
            nullable=False,
            server_default=sa.text("'admitted'"),
        ),
        sa.Column("discharged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("condition_at_discharge", sa.Text(), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT", name="fk_patients_created_by"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint("length(bed_number) >= 1", name="ck_patients_bed_number_len"),
        sa.CheckConstraint("length(name) >= 1", name="ck_patients_name_len"),
        sa.CheckConstraint("length(provisional_diagnosis) >= 1", name="ck_patients_diag_len"),
        sa.CheckConstraint("date_of_admission <= CURRENT_DATE", name="ck_patients_admission_date"),
    )

    # ── Indexes (partial WHERE status='admitted' for ward/acuity queries) ──────
    op.execute("CREATE INDEX ix_patients_ward ON patients (ward) WHERE status = 'admitted'")
    op.execute("CREATE INDEX ix_patients_acuity ON patients (acuity) WHERE status = 'admitted'")
    op.create_index("ix_patients_assigned_ho", "patients", ["assigned_ho"])
    op.create_index("ix_patients_status", "patients", ["status"])
    op.execute(
        "CREATE INDEX ix_patients_ward_acuity ON patients (ward, acuity) WHERE status = 'admitted'"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_patients_ward_acuity")
    op.drop_index("ix_patients_status", table_name="patients")
    op.drop_index("ix_patients_assigned_ho", table_name="patients")
    op.execute("DROP INDEX IF EXISTS ix_patients_acuity")
    op.execute("DROP INDEX IF EXISTS ix_patients_ward")
    op.drop_table("patients")
    sa.Enum(name="patient_status").drop(op.get_bind(), checkfirst=False)
    sa.Enum(name="patient_ward").drop(op.get_bind(), checkfirst=False)
    sa.Enum(name="patient_acuity").drop(op.get_bind(), checkfirst=False)
    sa.Enum(name="patient_sex").drop(op.get_bind(), checkfirst=False)
