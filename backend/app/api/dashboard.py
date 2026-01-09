from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.release import Release, ReleaseCriteria, ReleaseStatus, CriteriaStatus
from app.models.release_stakeholder import ReleaseStakeholder
from app.models.signoff import SignOff, SignOffStatus
from app.dependencies import RequireAnyRole

router = APIRouter()


@router.get("/dashboard/my-pending")
async def get_my_pending_signoffs(
    current_user: RequireAnyRole,
    db: AsyncSession = Depends(get_db),
):
    # Find releases where the current user is a stakeholder
    stakeholder_result = await db.execute(
        select(ReleaseStakeholder.release_id).where(
            ReleaseStakeholder.user_id == current_user.id
        )
    )
    stakeholder_release_ids = [r[0] for r in stakeholder_result.all()]

    if not stakeholder_release_ids:
        return []

    # Get all criteria for those releases that are in review
    criteria_result = await db.execute(
        select(ReleaseCriteria, Release)
        .join(Release)
        .options(selectinload(ReleaseCriteria.sign_offs))
        .where(
            ReleaseCriteria.release_id.in_(stakeholder_release_ids),
            Release.is_deleted == False,
            Release.status == ReleaseStatus.IN_REVIEW,  # Only show for releases in review
        )
        .order_by(Release.target_date.asc().nullslast())
    )
    all_rows = criteria_result.all()

    # Filter to criteria where user hasn't signed off (or sign-off was revoked)
    pending_items = []
    for criteria, release in all_rows:
        # Check if user has an active (non-revoked) sign-off for this criteria
        user_signoffs = [
            so for so in criteria.sign_offs
            if so.signed_by_id == current_user.id and so.status != SignOffStatus.REVOKED
        ]
        if not user_signoffs:
            pending_items.append((criteria, release))

    return [
        {
            "criteria_id": c.id,
            "criteria_name": c.name,
            "release_id": c.release_id,
            "release_name": r.name,
            "release_version": r.version,
            "is_mandatory": c.is_mandatory,
        }
        for c, r in pending_items
    ]


@router.get("/dashboard/releases-summary")
async def get_releases_summary(
    current_user: RequireAnyRole,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Release.status, func.count(Release.id))
        .where(Release.is_deleted == False)
        .group_by(Release.status)
    )
    status_counts = {status.value: count for status, count in result.all()}

    # Get total releases
    total_result = await db.execute(
        select(func.count(Release.id)).where(Release.is_deleted == False)
    )
    total = total_result.scalar()

    return {
        "total": total,
        "by_status": {
            "draft": status_counts.get("draft", 0),
            "in_review": status_counts.get("in_review", 0),
            "approved": status_counts.get("approved", 0),
            "released": status_counts.get("released", 0),
            "cancelled": status_counts.get("cancelled", 0),
        },
    }
