"""Auth DTOs — Pydantic v2 (matches contracts/openapi.yaml)."""

from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=1)  # policy enforced in service
    pmdc_number: str = Field(min_length=1, max_length=10)
    hospital_code: str = Field(min_length=1, max_length=20)
    department: str = Field(min_length=1, max_length=100)

    @field_validator("email", mode="after")
    @classmethod
    def _lowercase_email(cls, value: str) -> str:
        return value.lower()


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str

    @field_validator("email", mode="after")
    @classmethod
    def _lowercase_email(cls, value: str) -> str:
        return value.lower()


class UserPublic(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr
    role: str
    hospital_code: str
    department: str


class RegisterResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    token: str


class LoginResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str
    user: UserPublic
