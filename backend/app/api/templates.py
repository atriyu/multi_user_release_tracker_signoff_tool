from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.template import Template, TemplateCriteria
from app.schemas.template import (
    TemplateCreate,
    TemplateResponse,
    TemplateUpdate,
    TemplateCriteriaCreate,
    TemplateCriteriaResponse,
)
from app.dependencies import RequireAdmin, RequireAdminOrProductOwner, RequireAnyRole

router = APIRouter()


@router.get("/templates", response_model=List[TemplateResponse])
async def list_templates(
    current_user: RequireAnyRole,
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """List all templates."""
    query = select(Template).options(selectinload(Template.criteria))
    if not include_inactive:
        query = query.where(Template.is_active == True)

    result = await db.execute(query.order_by(Template.name))
    return result.scalars().all()


@router.post(
    "/templates",
    response_model=TemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_template(
    template: TemplateCreate,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    """Create a new template."""
    # Create template
    criteria_data = template.criteria
    template_dict = template.model_dump(exclude={"criteria"})
    db_template = Template(**template_dict)
    db.add(db_template)
    await db.flush()

    # Create criteria
    for idx, criteria in enumerate(criteria_data):
        criteria_dict = criteria.model_dump(exclude={"order"})
        db_criteria = TemplateCriteria(
            **criteria_dict,
            template_id=db_template.id,
            order=criteria.order if criteria.order is not None else idx,
        )
        db.add(db_criteria)

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Template)
        .where(Template.id == db_template.id)
        .options(selectinload(Template.criteria))
    )
    return result.scalar_one()


@router.get("/templates/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: int,
    current_user: RequireAnyRole,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Template)
        .where(Template.id == template_id)
        .options(selectinload(Template.criteria))
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    return template


@router.put("/templates/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    template_update: TemplateUpdate,
    current_user: RequireAdminOrProductOwner,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Template)
        .where(Template.id == template_id)
        .options(selectinload(Template.criteria))
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    update_data = template_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)

    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    await db.delete(template)
    await db.commit()


# Template Criteria endpoints
@router.post(
    "/templates/{template_id}/criteria",
    response_model=TemplateCriteriaResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_template_criteria(
    template_id: int,
    criteria: TemplateCriteriaCreate,
    current_user: RequireAdminOrProductOwner,
    db: AsyncSession = Depends(get_db),
):
    # Verify template exists
    template_result = await db.execute(select(Template).where(Template.id == template_id))
    if not template_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    db_criteria = TemplateCriteria(**criteria.model_dump(), template_id=template_id)
    db.add(db_criteria)
    await db.commit()
    await db.refresh(db_criteria)
    return db_criteria


@router.delete(
    "/templates/{template_id}/criteria/{criteria_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_template_criteria(
    template_id: int,
    criteria_id: int,
    current_user: RequireAdminOrProductOwner,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TemplateCriteria).where(
            TemplateCriteria.id == criteria_id,
            TemplateCriteria.template_id == template_id,
        )
    )
    criteria = result.scalar_one_or_none()
    if not criteria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Criteria not found",
        )

    await db.delete(criteria)
    await db.commit()
