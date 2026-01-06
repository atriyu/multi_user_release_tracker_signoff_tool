from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.release import Release, ReleaseCriteria, CriteriaStatus, ReleaseStatus
from app.models.signoff import SignOff, SignOffStatus
from app.models.release_stakeholder import ReleaseStakeholder
from app.schemas.signoff import SignOffCreate, SignOffResponse
from app.dependencies import RequireAdminOrProductOwner, RequireAnyRole
from app.utils.signoff_logic import compute_criteria_status

router = APIRouter()


@router.post(
    "/criteria/{criteria_id}/sign-off",
    response_model=SignOffResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_sign_off(
    criteria_id: int,
    sign_off: SignOffCreate,
    current_user: RequireAnyRole,  # Changed from RequireAdminOrProductOwner - stakeholders need to sign off
    db: AsyncSession = Depends(get_db),
):
    # Verify criteria exists
    result = await db.execute(
        select(ReleaseCriteria).where(ReleaseCriteria.id == criteria_id)
    )
    criteria = result.scalar_one_or_none()
    if not criteria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Criteria not found",
        )

    # Check if release is cancelled
    release_result = await db.execute(
        select(Release).where(Release.id == criteria.release_id)
    )
    release = release_result.scalar_one_or_none()
    if release and release.status == ReleaseStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot sign off on a cancelled release",
        )

    # Verify user is assigned as stakeholder to this release
    stakeholder_check = await db.execute(
        select(ReleaseStakeholder).where(
            ReleaseStakeholder.release_id == criteria.release_id,
            ReleaseStakeholder.user_id == current_user.id,
        )
    )
    if not stakeholder_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned as a stakeholder for this release",
        )

    # Validate link requirement for specific criteria
    criteria_requiring_link = [
        "Smoke & Extended Smoke Regression",
        "Full Regression",
        "CPT Sign-off",
    ]
    if criteria.name in criteria_requiring_link and sign_off.status == SignOffStatus.APPROVED:
        if not sign_off.link or not sign_off.link.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A test results link is required for '{criteria.name}'",
            )

    # Revoke any existing non-revoked sign-off by this user for this criteria
    existing_result = await db.execute(
        select(SignOff).where(
            SignOff.criteria_id == criteria_id,
            SignOff.signed_by_id == current_user.id,
            SignOff.status != SignOffStatus.REVOKED,
        )
    )
    existing_signoff = existing_result.scalar_one_or_none()
    if existing_signoff:
        existing_signoff.status = SignOffStatus.REVOKED

    # Create new sign-off
    db_signoff = SignOff(
        criteria_id=criteria_id,
        signed_by_id=current_user.id,
        status=sign_off.status,
        comment=sign_off.comment,
        link=sign_off.link,
    )
    db.add(db_signoff)
    await db.flush()  # Flush to get the signoff ID

    # Compute new criteria status based on all stakeholder sign-offs
    new_status = await compute_criteria_status(db, criteria_id)
    criteria.status = new_status

    await db.commit()
    await db.refresh(db_signoff)
    return db_signoff


@router.delete("/criteria/{criteria_id}/sign-off", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_sign_off(
    criteria_id: int,
    current_user: RequireAnyRole,  # Changed - stakeholders can revoke their own sign-offs
    db: AsyncSession = Depends(get_db),
):
    # Find the most recent non-revoked sign-off by this user
    result = await db.execute(
        select(SignOff)
        .where(
            SignOff.criteria_id == criteria_id,
            SignOff.signed_by_id == current_user.id,
            SignOff.status != SignOffStatus.REVOKED,
        )
        .order_by(SignOff.signed_at.desc())
        .limit(1)
    )
    sign_off = result.scalar_one_or_none()
    if not sign_off:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No sign-off found to revoke",
        )

    # Mark as revoked
    sign_off.status = SignOffStatus.REVOKED

    # Recompute criteria status based on remaining sign-offs
    criteria_result = await db.execute(
        select(ReleaseCriteria).where(ReleaseCriteria.id == criteria_id)
    )
    criteria = criteria_result.scalar_one()
    new_status = await compute_criteria_status(db, criteria_id)
    criteria.status = new_status

    await db.commit()


@router.get(
    "/releases/{release_id}/sign-offs",
    response_model=List[SignOffResponse],
)
async def list_release_sign_offs(
    release_id: int,
    current_user: RequireAnyRole,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SignOff)
        .join(ReleaseCriteria)
        .where(ReleaseCriteria.release_id == release_id)
        .order_by(SignOff.signed_at.desc())
    )
    return result.scalars().all()
