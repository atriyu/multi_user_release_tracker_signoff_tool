from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.product import Product
from app.models.product_permission import ProductPermission
from app.models.template import Template, TemplateCriteria
from app.models.release import Release, ReleaseCriteria, ReleaseStatus, CriteriaStatus
from app.models.release_stakeholder import ReleaseStakeholder
from app.models.user import User
from app.schemas.release import (
    ReleaseCreate,
    ReleaseResponse,
    ReleaseUpdate,
    ReleaseDetailResponse,
    ReleaseCriteriaCreate,
    ReleaseCriteriaResponse,
    ReleaseCriteriaUpdate,
)
from app.dependencies import RequireAdmin, RequireAnyRole, get_current_user

router = APIRouter()

# Canonical order for predefined criteria
PREDEFINED_CRITERIA_ORDER = [
    "Content Review",
    "Bug Verification",
    "Smoke & Extended Smoke Regression",
    "Full Regression",
    "CPT Sign-off",
    "Pre-Prod Monitoring incl. Crash Analysis",
    "Production Monitoring",
    "Security Audit",
]


def get_criteria_sort_key(criteria: ReleaseCriteria) -> tuple:
    """
    Returns a sort key for criteria to ensure consistent ordering.
    Predefined criteria come first in canonical order, custom criteria come last.
    """
    try:
        # If it's a predefined criteria, use its index in the canonical order
        index = PREDEFINED_CRITERIA_ORDER.index(criteria.name)
        return (0, index)  # (0 = predefined, index in canonical order)
    except ValueError:
        # Custom criteria come after predefined, sorted by name
        return (1, criteria.name.lower())  # (1 = custom, alphabetical)


def sort_criteria(criteria: List[ReleaseCriteria]) -> List[ReleaseCriteria]:
    """Sort criteria according to canonical order."""
    return sorted(criteria, key=get_criteria_sort_key)


def calculate_progress(criteria: List[ReleaseCriteria]) -> dict:
    mandatory = [c for c in criteria if c.is_mandatory]
    optional = [c for c in criteria if not c.is_mandatory]

    mandatory_approved = sum(1 for c in mandatory if c.status == CriteriaStatus.APPROVED)
    optional_approved = sum(1 for c in optional if c.status == CriteriaStatus.APPROVED)

    return {
        "mandatory_total": len(mandatory),
        "mandatory_approved": mandatory_approved,
        "mandatory_percent": (mandatory_approved / len(mandatory) * 100) if mandatory else 100,
        "optional_total": len(optional),
        "optional_approved": optional_approved,
        "optional_percent": (optional_approved / len(optional) * 100) if optional else 100,
        "all_mandatory_approved": mandatory_approved == len(mandatory),
    }


async def check_release_permission(
    user: User,
    release_id: int,
    db: AsyncSession
) -> None:
    """
    Check if user has permission to modify a release (admin or product owner for the release's product).
    Raises HTTPException if user doesn't have permission.
    """
    if user.is_admin:
        return  # Admins can modify all releases

    # Get the release with its product
    release_result = await db.execute(
        select(Release).where(Release.id == release_id, Release.is_deleted == False)
    )
    release = release_result.scalar_one_or_none()
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release not found",
        )

    # Check if user is a product owner for this product
    permission_result = await db.execute(
        select(ProductPermission).where(
            ProductPermission.product_id == release.product_id,
            ProductPermission.user_id == user.id,
        )
    )
    if not permission_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Only admins and product owners can modify release criteria.",
        )


@router.get("/releases", response_model=List[ReleaseResponse])
async def list_releases(
    current_user: RequireAnyRole,
    product_id: Optional[int] = None,
    status: Optional[ReleaseStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    query = select(Release).where(Release.is_deleted == False)

    if product_id:
        query = query.where(Release.product_id == product_id)
    if status:
        query = query.where(Release.status == status)

    query = query.offset(skip).limit(limit).order_by(Release.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/releases", response_model=ReleaseDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_release(
    release: ReleaseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify product exists
    product_result = await db.execute(select(Product).where(Product.id == release.product_id))
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Check if user has permission to create releases for this product
    if not current_user.is_admin:
        # Check if user is a product owner for this product
        permission_result = await db.execute(
            select(ProductPermission).where(
                ProductPermission.product_id == release.product_id,
                ProductPermission.user_id == current_user.id,
            )
        )
        permission = permission_result.scalar_one_or_none()
        if not permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and product owners can create releases for this product",
            )

    # Use product's default template if none specified
    template_id = release.template_id
    if template_id is None and product.default_template_id:
        template_id = product.default_template_id

    # Create release
    db_release = Release(
        product_id=release.product_id,
        template_id=template_id,
        version=release.version,
        name=release.name,
        description=release.description,
        target_date=release.target_date,
    )
    db.add(db_release)
    await db.flush()

    # If template provided, copy criteria from template
    if template_id:
        template_result = await db.execute(
            select(Template)
            .where(Template.id == template_id)
            .options(selectinload(Template.criteria))
        )
        template = template_result.scalar_one_or_none()
        if template:
            for tc in template.criteria:
                db_criteria = ReleaseCriteria(
                    release_id=db_release.id,
                    name=tc.name,
                    description=tc.description,
                    is_mandatory=tc.is_mandatory,
                    owner_id=tc.default_owner_id,
                    order=tc.order,
                )
                db.add(db_criteria)

    # Automatically assign the creating user as a stakeholder
    stakeholder = ReleaseStakeholder(
        release_id=db_release.id,
        user_id=current_user.id
    )
    db.add(stakeholder)

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Release)
        .where(Release.id == db_release.id)
        .options(
            selectinload(Release.criteria).selectinload(ReleaseCriteria.sign_offs),
            selectinload(Release.stakeholders).selectinload(ReleaseStakeholder.user)
        )
    )
    release_obj = result.scalar_one()

    return ReleaseDetailResponse(
        **{c.name: getattr(release_obj, c.name) for c in Release.__table__.columns},
        criteria=release_obj.criteria,
        progress=calculate_progress(release_obj.criteria),
        stakeholders=release_obj.stakeholders,
    )


@router.get("/releases/{release_id}", response_model=ReleaseDetailResponse)
async def get_release(
    release_id: int,
    current_user: RequireAnyRole,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Release)
        .where(Release.id == release_id, Release.is_deleted == False)
        .options(
            selectinload(Release.criteria).selectinload(ReleaseCriteria.sign_offs),
            selectinload(Release.stakeholders).selectinload(ReleaseStakeholder.user)
        )
    )
    release = result.scalar_one_or_none()
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release not found",
        )

    # Sort criteria in canonical order
    sorted_criteria = sort_criteria(release.criteria)

    return ReleaseDetailResponse(
        **{c.name: getattr(release, c.name) for c in Release.__table__.columns},
        criteria=sorted_criteria,
        progress=calculate_progress(sorted_criteria),
        stakeholders=release.stakeholders,
    )


@router.put("/releases/{release_id}", response_model=ReleaseResponse)
async def update_release(
    release_id: int,
    release_update: ReleaseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Release).where(Release.id == release_id, Release.is_deleted == False)
    )
    release = result.scalar_one_or_none()
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release not found",
        )

    # Check permissions
    await check_release_permission(current_user, release_id, db)

    update_data = release_update.model_dump(exclude_unset=True)

    # Special handling for status changes to 'cancelled'
    if 'status' in update_data and update_data['status'] == ReleaseStatus.CANCELLED:
        # Only allow cancelling from in_review or approved status
        if release.status not in [ReleaseStatus.IN_REVIEW, ReleaseStatus.APPROVED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Can only cancel releases in 'in_review' or 'approved' status. Current status: {release.status.value}",
            )

    for field, value in update_data.items():
        setattr(release, field, value)

    await db.commit()
    await db.refresh(release)
    return release


@router.delete("/releases/{release_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_release(
    release_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Release).where(Release.id == release_id, Release.is_deleted == False)
    )
    release = result.scalar_one_or_none()
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release not found",
        )

    # Check permissions
    await check_release_permission(current_user, release_id, db)

    # Only allow deleting draft releases
    if release.status != ReleaseStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only delete releases in 'draft' status. Current status: {release.status.value}. Use cancel instead for releases in review.",
        )

    # Soft delete
    release.is_deleted = True
    await db.commit()


# Release Criteria endpoints
@router.post(
    "/releases/{release_id}/criteria",
    response_model=ReleaseCriteriaResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_release_criteria(
    release_id: int,
    criteria: ReleaseCriteriaCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check permission (admin or product owner)
    await check_release_permission(current_user, release_id, db)

    db_criteria = ReleaseCriteria(**criteria.model_dump(), release_id=release_id)
    db.add(db_criteria)
    await db.commit()

    # Reload with sign_offs
    result = await db.execute(
        select(ReleaseCriteria)
        .where(ReleaseCriteria.id == db_criteria.id)
        .options(selectinload(ReleaseCriteria.sign_offs))
    )
    return result.scalar_one()


@router.put(
    "/releases/{release_id}/criteria/{criteria_id}",
    response_model=ReleaseCriteriaResponse,
)
async def update_release_criteria(
    release_id: int,
    criteria_id: int,
    criteria_update: ReleaseCriteriaUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check permission (admin or product owner)
    await check_release_permission(current_user, release_id, db)

    result = await db.execute(
        select(ReleaseCriteria)
        .where(
            ReleaseCriteria.id == criteria_id,
            ReleaseCriteria.release_id == release_id,
        )
        .options(selectinload(ReleaseCriteria.sign_offs))
    )
    criteria = result.scalar_one_or_none()
    if not criteria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Criteria not found",
        )

    update_data = criteria_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(criteria, field, value)

    await db.commit()
    await db.refresh(criteria)
    return criteria


@router.delete(
    "/releases/{release_id}/criteria/{criteria_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_release_criteria(
    release_id: int,
    criteria_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check permission (admin or product owner)
    await check_release_permission(current_user, release_id, db)

    result = await db.execute(
        select(ReleaseCriteria).where(
            ReleaseCriteria.id == criteria_id,
            ReleaseCriteria.release_id == release_id,
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
