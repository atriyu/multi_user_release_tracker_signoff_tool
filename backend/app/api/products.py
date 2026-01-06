from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.product import Product
from app.models.template import Template
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.dependencies import RequireAdmin, RequireAnyRole

router = APIRouter()


@router.get("/products", response_model=List[ProductResponse])
async def list_products(
    current_user: RequireAnyRole,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.permissions))
        .offset(skip)
        .limit(limit)
        .order_by(Product.name)
    )
    products = result.scalars().all()

    # Map permissions to product_owners for response
    response_products = []
    for product in products:
        product_dict = {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "default_template_id": product.default_template_id,
            "created_at": product.created_at,
            "updated_at": product.updated_at,
            "product_owners": [
                {
                    "id": p.id,
                    "user_id": p.user_id,
                    "permission_type": p.permission_type,
                    "granted_at": p.granted_at,
                }
                for p in product.permissions
            ],
        }
        response_products.append(product_dict)

    return response_products


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product: ProductCreate,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    # Check for duplicate name
    existing = await db.execute(select(Product).where(Product.name == product.name))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product with this name already exists",
        )

    db_product = Product(**product.model_dump())
    db.add(db_product)
    await db.commit()
    await db.refresh(db_product)
    return db_product


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    current_user: RequireAnyRole,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.permissions))
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Map permissions to product_owners for response
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "default_template_id": product.default_template_id,
        "created_at": product.created_at,
        "updated_at": product.updated_at,
        "product_owners": [
            {
                "id": p.id,
                "user_id": p.user_id,
                "permission_type": p.permission_type,
                "granted_at": p.granted_at,
            }
            for p in product.permissions
        ],
    }


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_update: ProductUpdate,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Validate default_template_id if provided
    if product_update.default_template_id is not None:
        template_result = await db.execute(
            select(Template).where(
                Template.id == product_update.default_template_id,
                Template.is_active == True,
            )
        )
        if not template_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Template not found or inactive",
            )

    update_data = product_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    await db.delete(product)
    await db.commit()
