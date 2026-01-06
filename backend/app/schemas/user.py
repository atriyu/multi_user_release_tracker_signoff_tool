from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    """
    Create a new user.
    Note: role field is deprecated and automatically synced from is_admin.
    """
    is_admin: bool = False


class UserUpdate(BaseModel):
    """
    Update user information.
    Note: role field is deprecated and automatically synced from is_admin.
    """
    name: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class UserResponse(UserBase):
    """
    User response - role field hidden from API, only is_admin exposed.
    """
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True
