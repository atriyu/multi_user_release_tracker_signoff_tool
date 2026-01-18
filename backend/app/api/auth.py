from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.database import get_db
from app.models.user import User, UserRole
from app.config import get_settings
from app.utils.jwt import create_access_token
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["authentication"])


class GoogleAuthRequest(BaseModel):
    """Request body for Google OAuth authentication."""
    credential: str  # Google ID token from frontend


class AuthResponse(BaseModel):
    """Response for successful authentication."""
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    """User data in auth response."""
    id: int
    email: str
    name: str
    is_admin: bool
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class CurrentUserResponse(BaseModel):
    """Response for current user endpoint."""
    id: int
    email: str
    name: str
    is_admin: bool
    avatar_url: Optional[str] = None
    is_product_owner: bool = False

    class Config:
        from_attributes = True


@router.post("/google", response_model=AuthResponse)
async def google_auth(
    request: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate with Google OAuth.

    - Verifies the Google ID token
    - Creates a new user if they don't exist (auto-create on first login)
    - Returns a JWT access token for the application
    """
    settings = get_settings()

    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured"
        )

    try:
        # Verify the Google ID token
        idinfo = id_token.verify_oauth2_token(
            request.credential,
            google_requests.Request(),
            settings.google_client_id
        )

        # Extract user info from the token
        google_id = idinfo["sub"]
        email = idinfo["email"]
        name = idinfo.get("name", email.split("@")[0])
        avatar_url = idinfo.get("picture")

        if not idinfo.get("email_verified", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not verified with Google"
            )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )

    # Check if user exists by google_id or email
    result = await db.execute(
        select(User).where(
            (User.google_id == google_id) | (User.email == email)
        )
    )
    user = result.scalar_one_or_none()

    if user:
        # Update existing user's Google info if needed
        if not user.google_id:
            user.google_id = google_id
        if avatar_url and user.avatar_url != avatar_url:
            user.avatar_url = avatar_url
        if user.name != name:
            user.name = name
        await db.commit()
        await db.refresh(user)
    else:
        # Create new user (auto-create on first login)
        user = User(
            email=email,
            name=name,
            google_id=google_id,
            avatar_url=avatar_url,
            is_active=True,
            is_admin=False,
            role=UserRole.STAKEHOLDER
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    # Create JWT access token
    access_token = create_access_token(user.id, user.email)

    return AuthResponse(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            is_admin=user.is_admin,
            avatar_url=user.avatar_url
        )
    )


@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the current authenticated user's information."""
    # Check if user has any product permissions (is product owner)
    from app.models.product_permission import ProductPermission
    result = await db.execute(
        select(ProductPermission).where(ProductPermission.user_id == current_user.id).limit(1)
    )
    is_product_owner = result.scalar_one_or_none() is not None

    return CurrentUserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        is_admin=current_user.is_admin,
        avatar_url=current_user.avatar_url,
        is_product_owner=is_product_owner or current_user.is_admin
    )


@router.post("/logout")
async def logout():
    """
    Logout endpoint.

    Since we use JWT tokens, actual logout happens client-side by removing the token.
    This endpoint exists for API consistency and potential future server-side token invalidation.
    """
    return {"message": "Logged out successfully"}
