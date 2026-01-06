from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.release import Release, ReleaseCriteria
from app.models.release_stakeholder import ReleaseStakeholder
from app.models.signoff import SignOff, SignOffStatus
from app.models.user import User
from app.schemas.release_stakeholder import (
    ReleaseStakeholderCreate,
    ReleaseStakeholderResponse,
    ReleaseStakeholderWithUser,
    StakeholderUser,
)
from app.schemas.release import (
    ReleaseSignOffMatrixResponse,
    CriteriaSignOffMatrix,
    StakeholderSignOffStatus,
)
from app.dependencies import RequireAdminOrProductOwner, RequireAnyRole
from app.utils.signoff_logic import compute_criteria_status

router = APIRouter()

# Canonical order for predefined criteria (must match releases.py)
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


@router.post(
    "/releases/{release_id}/stakeholders",
    response_model=List[ReleaseStakeholderResponse],
    status_code=status.HTTP_201_CREATED,
)
async def assign_stakeholders(
    release_id: int,
    stakeholder_data: ReleaseStakeholderCreate,
    current_user: RequireAdminOrProductOwner,
    db: AsyncSession = Depends(get_db),
):
    """Assign multiple stakeholders to a release"""
    # Verify release exists
    result = await db.execute(select(Release).where(Release.id == release_id))
    release = result.scalar_one_or_none()
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release not found",
        )

    # Verify all users exist and are stakeholders
    user_result = await db.execute(
        select(User).where(User.id.in_(stakeholder_data.user_ids))
    )
    users = user_result.scalars().all()
    if len(users) != len(stakeholder_data.user_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more user IDs are invalid",
        )

    # Create stakeholder assignments (skip duplicates)
    created_stakeholders = []
    for user_id in stakeholder_data.user_ids:
        # Check if already assigned
        existing = await db.execute(
            select(ReleaseStakeholder).where(
                ReleaseStakeholder.release_id == release_id,
                ReleaseStakeholder.user_id == user_id,
            )
        )
        if existing.scalar_one_or_none():
            continue  # Skip if already assigned

        stakeholder = ReleaseStakeholder(release_id=release_id, user_id=user_id)
        db.add(stakeholder)
        created_stakeholders.append(stakeholder)

    await db.commit()
    for stakeholder in created_stakeholders:
        await db.refresh(stakeholder)

    return created_stakeholders


@router.get(
    "/releases/{release_id}/stakeholders",
    response_model=List[ReleaseStakeholderWithUser],
)
async def list_stakeholders(
    release_id: int,
    current_user: RequireAdminOrProductOwner,
    db: AsyncSession = Depends(get_db),
):
    """List all stakeholders assigned to a release"""
    result = await db.execute(
        select(ReleaseStakeholder)
        .options(selectinload(ReleaseStakeholder.user))
        .where(ReleaseStakeholder.release_id == release_id)
        .order_by(ReleaseStakeholder.assigned_at)
    )
    stakeholders = result.scalars().all()
    return stakeholders


@router.delete(
    "/releases/{release_id}/stakeholders/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_stakeholder(
    release_id: int,
    user_id: int,
    current_user: RequireAdminOrProductOwner,
    db: AsyncSession = Depends(get_db),
):
    """Remove a stakeholder from a release"""
    result = await db.execute(
        select(ReleaseStakeholder).where(
            ReleaseStakeholder.release_id == release_id,
            ReleaseStakeholder.user_id == user_id,
        )
    )
    stakeholder = result.scalar_one_or_none()
    if not stakeholder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stakeholder assignment not found",
        )

    await db.delete(stakeholder)
    await db.commit()


@router.get(
    "/releases/{release_id}/sign-off-matrix",
    response_model=ReleaseSignOffMatrixResponse,
)
async def get_sign_off_matrix(
    release_id: int,
    current_user: RequireAnyRole,
    db: AsyncSession = Depends(get_db),
):
    """Get complete sign-off matrix for a release (criteria × stakeholders)"""
    # Verify release exists
    release_result = await db.execute(select(Release).where(Release.id == release_id))
    release = release_result.scalar_one_or_none()
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release not found",
        )

    # Get all stakeholders
    stakeholders_result = await db.execute(
        select(ReleaseStakeholder)
        .options(selectinload(ReleaseStakeholder.user))
        .where(ReleaseStakeholder.release_id == release_id)
        .order_by(ReleaseStakeholder.assigned_at)
    )
    stakeholders = stakeholders_result.scalars().all()
    stakeholder_users = [
        StakeholderUser(
            id=s.user.id,
            name=s.user.name,
            email=s.user.email,
            role=s.user.role.value,
        )
        for s in stakeholders
    ]

    # Get all criteria
    criteria_result = await db.execute(
        select(ReleaseCriteria)
        .where(ReleaseCriteria.release_id == release_id)
    )
    criteria_list = criteria_result.scalars().all()

    # Sort criteria in canonical order
    criteria_list = sort_criteria(criteria_list)

    # Get all sign-offs for this release
    signoffs_result = await db.execute(
        select(SignOff)
        .join(ReleaseCriteria)
        .where(
            ReleaseCriteria.release_id == release_id,
            SignOff.status != SignOffStatus.REVOKED,
        )
    )
    all_signoffs = signoffs_result.scalars().all()

    # Build matrix
    criteria_matrix = []
    for criteria in criteria_list:
        # Compute status
        computed_status = await compute_criteria_status(db, criteria.id)

        # Get sign-offs for this criteria
        criteria_signoffs = [s for s in all_signoffs if s.criteria_id == criteria.id]

        # Build stakeholder sign-off status list
        stakeholder_signoffs = []
        for stakeholder in stakeholders:
            user_signoff = next(
                (s for s in criteria_signoffs if s.signed_by_id == stakeholder.user_id),
                None
            )
            if user_signoff:
                stakeholder_signoffs.append(
                    StakeholderSignOffStatus(
                        user_id=stakeholder.user_id,
                        user_name=stakeholder.user.name,
                        user_email=stakeholder.user.email,
                        status=user_signoff.status.value,
                        comment=user_signoff.comment,
                        link=user_signoff.link,
                        signed_at=user_signoff.signed_at,
                    )
                )
            else:
                stakeholder_signoffs.append(
                    StakeholderSignOffStatus(
                        user_id=stakeholder.user_id,
                        user_name=stakeholder.user.name,
                        user_email=stakeholder.user.email,
                        status=None,
                        comment=None,
                        link=None,
                        signed_at=None,
                    )
                )

        criteria_matrix.append(
            CriteriaSignOffMatrix(
                criteria_id=criteria.id,
                criteria_name=criteria.name,
                is_mandatory=criteria.is_mandatory,
                computed_status=computed_status,
                stakeholder_signoffs=stakeholder_signoffs,
            )
        )

    return ReleaseSignOffMatrixResponse(
        release_id=release_id,
        stakeholders=stakeholder_users,
        criteria_matrix=criteria_matrix,
    )
