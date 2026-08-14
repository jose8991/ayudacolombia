from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field


class NeedCategory(StrEnum):
    FOOD = "food"
    WATER = "water"
    MEDICINE = "medicine"
    SHELTER = "shelter"
    TRANSPORT = "transport"
    OTHER = "other"


class NeedUrgency(StrEnum):
    IMMEDIATE_DANGER = "immediate_danger"
    TODAY = "today"
    SOON = "soon"


class NeedCreate(BaseModel):
    territory_id: str = Field(min_length=3, max_length=80)
    category: NeedCategory
    people_count: int = Field(ge=1, le=500)
    neighborhood: str = Field(min_length=2, max_length=120)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)
    urgency: NeedUrgency
    contact: str = Field(min_length=5, max_length=160)
    description: str | None = Field(default=None, max_length=600)
    privacy_authorized: Literal[True]
    privacy_policy_version: str = Field(min_length=1, max_length=32)


class NeedReceipt(BaseModel):
    tracking_code: str
    status: str
    message: str


class NeedStatus(BaseModel):
    tracking_code: str
    status: str
    category: NeedCategory
    neighborhood: str
    created_at: datetime
    updated_at: datetime
