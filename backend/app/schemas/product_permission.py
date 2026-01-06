from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


class ProductPermissionBase(BaseModel):
    product_id: int
    user_id: int
    permission_type: str = "product_owner"


class ProductPermissionCreate(BaseModel):
    """Request to grant product permission to users"""
    user_ids: list[int]
    permission_type: str = "product_owner"


class ProductPermissionResponse(ProductPermissionBase):
    id: int
    granted_by_id: Optional[int]
    granted_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductPermissionWithUser(ProductPermissionResponse):
    """ProductPermission with user details included"""
    user: "UserBasicInfo"


class UserBasicInfo(BaseModel):
    """Basic user info for permission displays"""
    id: int
    name: str
    email: str
    is_admin: bool

    model_config = ConfigDict(from_attributes=True)


# Update forward ref
ProductPermissionWithUser.model_rebuild()
