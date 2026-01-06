from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_template_id: Optional[int] = None


class ProductOwnerInfo(BaseModel):
    id: int
    user_id: int
    permission_type: str
    granted_at: datetime

    class Config:
        from_attributes = True


class ProductResponse(ProductBase):
    id: int
    default_template_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    product_owners: List[ProductOwnerInfo] = []

    class Config:
        from_attributes = True
