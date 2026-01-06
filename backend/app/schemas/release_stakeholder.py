from datetime import datetime
from pydantic import BaseModel
from typing import List


class ReleaseStakeholderBase(BaseModel):
    user_id: int


class ReleaseStakeholderCreate(BaseModel):
    user_ids: List[int]  # Bulk assign multiple stakeholders


class ReleaseStakeholderResponse(BaseModel):
    id: int
    release_id: int
    user_id: int
    assigned_at: datetime

    class Config:
        from_attributes = True


class StakeholderUser(BaseModel):
    """User info for stakeholder display"""
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True


class ReleaseStakeholderWithUser(BaseModel):
    """Stakeholder assignment with user details"""
    id: int
    release_id: int
    user_id: int
    assigned_at: datetime
    user: StakeholderUser

    class Config:
        from_attributes = True
