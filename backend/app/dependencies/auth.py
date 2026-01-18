from typing import List, Optional
try:
    from typing import Annotated
except ImportError:
    from typing_extensions import Annotated

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User, UserRole
from app.utils.jwt import get_user_id_from_token

# Optional bearer token security scheme
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    x_user_id: Annotated[Optional[int], Header()] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get the current user from JWT token or X-User-Id header.

    Authentication methods (in order of precedence):
    1. JWT Bearer token (Authorization: Bearer <token>)
    2. X-User-Id header (for admin impersonation when authenticated)

    For admin impersonation:
    - If both JWT and X-User-Id are provided, the JWT-authenticated user must be an admin
    - The X-User-Id is then used to impersonate another user
    """
    user_id = None
    is_impersonating = False
    jwt_user = None

    # Try JWT authentication first
    if credentials and credentials.credentials:
        jwt_user_id = get_user_id_from_token(credentials.credentials)
        if jwt_user_id:
            # Valid JWT token
            result = await db.execute(select(User).where(User.id == jwt_user_id))
            jwt_user = result.scalar_one_or_none()

            if jwt_user and jwt_user.is_active:
                # Check if admin is trying to impersonate via X-User-Id
                if x_user_id and x_user_id != jwt_user_id and jwt_user.is_admin:
                    # Admin impersonation
                    user_id = x_user_id
                    is_impersonating = True
                else:
                    user_id = jwt_user_id

    # Fall back to X-User-Id header only (legacy/development mode)
    if user_id is None and x_user_id is not None:
        user_id = x_user_id

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a valid JWT token or X-User-Id header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch the target user
    if is_impersonating:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
    else:
        user = jwt_user if jwt_user and jwt_user.id == user_id else None
        if not user:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is deactivated",
        )

    return user


def require_roles(allowed_roles: List[UserRole]):
    """
    Dependency factory that creates a role checker.

    Usage:
        @router.post("/products")
        async def create_product(
            user: Annotated[User, Depends(require_roles([UserRole.ADMIN]))],
            ...
        ):
    """
    async def role_checker(
        current_user: Annotated[User, Depends(get_current_user)]
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {[r.value for r in allowed_roles]}",
            )
        return current_user

    return role_checker


# Pre-built role dependencies for common use cases
RequireAdmin = Annotated[User, Depends(require_roles([UserRole.ADMIN]))]
RequireAdminOrProductOwner = Annotated[User, Depends(require_roles([UserRole.ADMIN, UserRole.PRODUCT_OWNER]))]
RequireAnyRole = Annotated[User, Depends(get_current_user)]  # Just needs to be authenticated
