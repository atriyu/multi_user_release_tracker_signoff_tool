from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.release import Release, ReleaseCriteria, ReleaseStatus, CriteriaStatus
from app.dependencies import RequireAnyRole

router = APIRouter()


@router.get("/dashboard/my-pending")
async def get_my_pending_signoffs(
    current_user: RequireAnyRole,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ReleaseCriteria)
        .join(Release)
        .where(
            ReleaseCriteria.owner_id == current_user.id,
            ReleaseCriteria.status == CriteriaStatus.PENDING,
            Release.is_deleted == False,
            Release.status.in_([ReleaseStatus.DRAFT, ReleaseStatus.IN_REVIEW]),
        )
        .order_by(Release.target_date.asc().nullslast())
    )
    criteria_list = result.scalars().all()

    return [
        {
            "criteria_id": c.id,
            "criteria_name": c.name,
            "release_id": c.release_id,
            "is_mandatory": c.is_mandatory,
        }
        for c in criteria_list
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
