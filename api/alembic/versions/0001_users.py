"""users table — P0 Foundation.

Revision ID: 0001_users
Revises:
Create Date: 2026-04-21

Hand-written (Principle II — no --autogenerate in P0). Creates the
``user_role`` Postgres enum, the ``users`` table with all columns per
data-model.md, the case-insensitive unique index on ``LOWER(email)``,
and the unique index on ``pmdc_number``. Fully reversible.
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0001_users"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    user_role = sa.Enum(
        "ho",
        "senior_resident",
        "consultant",
        name="user_role",
    )
    user_role.create(op.get_bind(), checkfirst=False)

    op.create_table(
        "users",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("password_hash", sa.String(length=60), nullable=False),
        sa.Column("pmdc_number", sa.String(length=10), nullable=False),
        sa.Column("hospital_code", sa.String(length=20), nullable=False),
        sa.Column("department", sa.String(length=100), nullable=False),
        sa.Column(
            "role",
            sa.Enum(name="user_role", create_type=False),
            nullable=False,
            server_default="ho",
        ),
        sa.Column(
            "failed_login_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
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
    )

    op.execute("CREATE UNIQUE INDEX ix_users_email_lower ON users (LOWER(email))")
    op.create_index("ux_users_pmdc_number", "users", ["pmdc_number"], unique=True)


def downgrade() -> None:
    op.drop_index("ux_users_pmdc_number", table_name="users")
    op.execute("DROP INDEX IF EXISTS ix_users_email_lower")
    op.drop_table("users")
    sa.Enum(name="user_role").drop(op.get_bind(), checkfirst=False)
