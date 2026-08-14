from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from .schemas import Actor


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    actor: Actor


class CenterOperatorInvitationCreate(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=160)
    center_id: UUID


class InvitationResponse(BaseModel):
    token: str
    expires_in: int = 24 * 60 * 60


class InvitationAccept(BaseModel):
    token: str = Field(min_length=20)
    password: str = Field(min_length=12, max_length=128)
    privacy_authorized: Literal[True]
    privacy_policy_version: str = Field(min_length=1, max_length=32)
