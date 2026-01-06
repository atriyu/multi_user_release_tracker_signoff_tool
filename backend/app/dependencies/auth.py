from typing import List, Optional
try:
    from typing import Annotated
except ImportError:
    from typing_extensions import Annotated

from fastapi import Depends, HTTPException, status, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User, UserRole


async def get_current_user(
    x_user_id: Annotated[Optional[int], Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get the current user from request header.

    NOTE: This is a simplified implementation for development/demo purposes.
    In production, this would parse JWT tokens, validate sessions, or
    integrate with OAuth/OIDC providers.

    For now, we use X-User-Id header for development purposes.
    """
    if x_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-User-Id header required",
        )

    result = await db.execute(select(User).where(User.id == x_user_id))
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
