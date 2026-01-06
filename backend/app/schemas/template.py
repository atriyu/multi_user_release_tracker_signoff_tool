from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class TemplateCriteriaBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_mandatory: bool = True
    default_owner_id: Optional[int] = None
    order: int = 0


class TemplateCriteriaCreate(TemplateCriteriaBase):
    pass


class TemplateCriteriaResponse(TemplateCriteriaBase):
    id: int
    template_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True


class TemplateCreate(TemplateBase):
    criteria: List[TemplateCriteriaCreate] = []


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class TemplateResponse(TemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime
    criteria: List[TemplateCriteriaResponse] = []

    class Config:
        from_attributes = True
