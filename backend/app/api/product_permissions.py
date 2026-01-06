from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.product import Product
from app.models.product_permission import ProductPermission
from app.models.user import User
from app.schemas.product_permission import (
    ProductPermissionCreate,
    ProductPermissionResponse,
    ProductPermissionWithUser,
    UserBasicInfo,
)
from app.dependencies import RequireAdmin

router = APIRouter()


@router.post(
    "/products/{product_id}/permissions",
    response_model=List[ProductPermissionResponse],
    status_code=status.HTTP_201_CREATED,
)
async def grant_product_permissions(
    product_id: int,
    permission_data: ProductPermissionCreate,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    """
    Grant product owner permissions to users.
    Only admins can grant product permissions.
    """
    # Verify product exists
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Verify all users exist
    user_result = await db.execute(
        select(User).where(User.id.in_(permission_data.user_ids))
    )
    users = user_result.scalars().all()
    if len(users) != len(permission_data.user_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more user IDs are invalid",
        )

    # Grant permissions (skip duplicates)
    created_permissions = []
    for user_id in permission_data.user_ids:
        # Check if already has permission
        existing = await db.execute(
            select(ProductPermission).where(
                ProductPermission.product_id == product_id,
                ProductPermission.user_id == user_id,
            )
        )
        if existing.scalar_one_or_none():
            continue  # Skip if already has permission

        permission = ProductPermission(
            product_id=product_id,
            user_id=user_id,
            permission_type=permission_data.permission_type,
            granted_by_id=current_user.id,
        )
        db.add(permission)
        created_permissions.append(permission)

    await db.commit()

    # Refresh and sync roles for affected users
    for permission in created_permissions:
        await db.refresh(permission)
        # Get user and sync their role
        user_result = await db.execute(select(User).where(User.id == permission.user_id))
        user = user_result.scalar_one()
        await user.sync_role_from_permissions(db)

    await db.commit()

    return created_permissions


@router.get(
    "/products/{product_id}/permissions",
    response_model=List[ProductPermissionWithUser],
)
async def list_product_permissions(
    product_id: int,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    """
    List all users with product owner permissions for a product.
    Only admins can view product permissions.
    """
    # Verify product exists
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Get permissions with user details
    result = await db.execute(
        select(ProductPermission)
        .where(ProductPermission.product_id == product_id)
        .options(selectinload(ProductPermission.user))
    )
    permissions = result.scalars().all()

    # Convert to response format with user info
    return [
        ProductPermissionWithUser(
            id=p.id,
            product_id=p.product_id,
            user_id=p.user_id,
            permission_type=p.permission_type,
            granted_by_id=p.granted_by_id,
            granted_at=p.granted_at,
            user=UserBasicInfo(
                id=p.user.id,
                name=p.user.name,
                email=p.user.email,
                is_admin=p.user.is_admin,
            ),
        )
        for p in permissions
    ]


@router.delete(
    "/products/{product_id}/permissions/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def revoke_product_permission(
    product_id: int,
    user_id: int,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    """
    Revoke product owner permission from a user.
    Only admins can revoke product permissions.
    """
    # Find the permission
    result = await db.execute(
        select(ProductPermission).where(
            ProductPermission.product_id == product_id,
            ProductPermission.user_id == user_id,
        )
    )
    permission = result.scalar_one_or_none()

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found",
        )

    await db.delete(permission)

    # Sync role for affected user
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one()
    await user.sync_role_from_permissions(db)

    await db.commit()
