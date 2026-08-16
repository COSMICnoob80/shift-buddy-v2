"""Alembic environment — sync driver derived from app settings."""

from __future__ import annotations

import os
import re
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context
from app.models.base import Base
from app.models.user import User  # noqa: F401  (register model for metadata)

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _resolve_url() -> str:
    raw = os.environ.get("DATABASE_URL", "")
    if not raw:
        raw = "postgresql+psycopg2://postgres:postgres@localhost:5432/shiftbuddy"
    return re.sub(r"\+asyncpg", "+psycopg2", raw)


def run_migrations_offline() -> None:
    context.configure(
        url=_resolve_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    cfg_section = config.get_section(config.config_ini_section) or {}
    cfg_section["sqlalchemy.url"] = _resolve_url()
    connectable = engine_from_config(
        cfg_section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
