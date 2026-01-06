from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from app.models.release import ReleaseStatus, CriteriaStatus
from app.schemas.signoff import SignOffResponse
from app.schemas.release_stakeholder import ReleaseStakeholderWithUser, StakeholderUser


class ReleaseCriteriaBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_mandatory: bool = True
    owner_id: Optional[int] = None
    order: int = 0


class ReleaseCriteriaCreate(ReleaseCriteriaBase):
    pass


class ReleaseCriteriaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_mandatory: Optional[bool] = None
    owner_id: Optional[int] = None
    status: Optional[CriteriaStatus] = None
    order: Optional[int] = None


class ReleaseCriteriaResponse(ReleaseCriteriaBase):
    id: int
    release_id: int
    status: CriteriaStatus
    created_at: datetime
    updated_at: datetime
    sign_offs: List[SignOffResponse] = []

    class Config:
        from_attributes = True


class ReleaseBase(BaseModel):
    version: str
    name: str
    description: Optional[str] = None
    target_date: Optional[date] = None


class ReleaseCreate(ReleaseBase):
    product_id: int
    template_id: Optional[int] = None


class ReleaseUpdate(BaseModel):
    version: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ReleaseStatus] = None
    target_date: Optional[date] = None


class ReleaseResponse(ReleaseBase):
    id: int
    product_id: int
    template_id: Optional[int]
    status: ReleaseStatus
    created_by_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    released_at: Optional[datetime]

    class Config:
        from_attributes = True


class ReleaseDetailResponse(ReleaseResponse):
    criteria: List[ReleaseCriteriaResponse] = []
    progress: Dict[str, Any] = {}
    stakeholders: List[ReleaseStakeholderWithUser] = []

    class Config:
        from_attributes = True


class StakeholderSignOffStatus(BaseModel):
    """Per-stakeholder sign-off status for a criteria"""
    user_id: int
    user_name: str
    user_email: str
    status: Optional[str] = None  # 'approved', 'rejected', 'revoked', or None (not signed off)
    comment: Optional[str] = None
    link: Optional[str] = None
    signed_at: Optional[datetime] = None


class CriteriaSignOffMatrix(BaseModel):
    """Sign-off matrix for a single criteria across all stakeholders"""
    criteria_id: int
    criteria_name: str
    is_mandatory: bool
    computed_status: CriteriaStatus
    stakeholder_signoffs: List[StakeholderSignOffStatus]


class ReleaseSignOffMatrixResponse(BaseModel):
    """Complete sign-off matrix for a release"""
    release_id: int
    stakeholders: List[StakeholderUser]
    criteria_matrix: List[CriteriaSignOffMatrix]
