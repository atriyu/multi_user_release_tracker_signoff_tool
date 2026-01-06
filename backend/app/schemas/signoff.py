from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.signoff import SignOffStatus


class SignOffBase(BaseModel):
    status: SignOffStatus
    comment: Optional[str] = None
    link: Optional[str] = None


class SignOffCreate(SignOffBase):
    pass


class SignOffResponse(SignOffBase):
    id: int
    criteria_id: int
    signed_by_id: int
    signed_at: datetime

    class Config:
        from_attributes = True
