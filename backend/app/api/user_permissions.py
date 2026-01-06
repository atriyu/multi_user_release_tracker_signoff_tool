from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.product import Product
from app.models.product_permission import ProductPermission
from app.models.user import User
from app.dependencies import RequireAdmin

router = APIRouter()


@router.post("/users/{user_id}/grant-product-owner", status_code=status.HTTP_200_OK)
async def grant_product_owner_permission(
    user_id: int,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    """
    Grant product owner permission to a user for ALL products.
    This makes them a Product Owner who can manage releases and templates.
    """
    # Verify user exists
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    if user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System administrators already have full access",
        )
    
    # Get all products
    products_result = await db.execute(select(Product))
    products = products_result.scalars().all()
    
    # Grant permission for each product (skip if already exists)
    for product in products:
        existing = await db.execute(
            select(ProductPermission).where(
                ProductPermission.product_id == product.id,
                ProductPermission.user_id == user_id,
            )
        )
        if not existing.scalar_one_or_none():
            permission = ProductPermission(
                product_id=product.id,
                user_id=user_id,
                permission_type="product_owner",
                granted_by_id=current_user.id,
            )
            db.add(permission)
    
    # Sync role
    await user.sync_role_from_permissions(db)
    await db.commit()
    
    return {"message": "Product owner permission granted successfully"}


@router.delete("/users/{user_id}/revoke-product-owner", status_code=status.HTTP_200_OK)
async def revoke_product_owner_permission(
    user_id: int,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    """
    Revoke product owner permission from a user for ALL products.
    """
    # Verify user exists
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Delete all product permissions for this user
    await db.execute(
        delete(ProductPermission).where(ProductPermission.user_id == user_id)
    )
    
    # Sync role
    await user.sync_role_from_permissions(db)
    await db.commit()
    
    return {"message": "Product owner permission revoked successfully"}


@router.get("/users/{user_id}/is-product-owner")
async def check_product_owner_status(
    user_id: int,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    """
    Check if a user has product owner permissions.
    """
    result = await db.execute(
        select(ProductPermission).where(ProductPermission.user_id == user_id).limit(1)
    )
    has_permission = result.scalar_one_or_none() is not None
    
    return {"is_product_owner": has_permission}
