"""
Utilities for computing criteria status based on multi-user sign-offs
"""
from typing import List, Dict, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.release import ReleaseCriteria, CriteriaStatus
from app.models.signoff import SignOff, SignOffStatus
from app.models.release_stakeholder import ReleaseStakeholder


async def compute_criteria_status(
    db: AsyncSession,
    criteria_id: int,
) -> CriteriaStatus:
    """
    Compute the status of a criteria based on all stakeholder sign-offs.

    Rules:
    - REJECTED: If ANY stakeholder has rejected
    - APPROVED: If ALL stakeholders have approved (and none rejected)
    - PENDING: Otherwise (some haven't signed off, or some revoked)
    - BLOCKED: Manually set (not computed)

    Args:
        db: Database session
        criteria_id: ID of the criteria

    Returns:
        Computed CriteriaStatus
    """
    # Get the criteria and its release
    criteria_result = await db.execute(
        select(ReleaseCriteria).where(ReleaseCriteria.id == criteria_id)
    )
    criteria = criteria_result.scalar_one()

    # Get all stakeholders for this release
    stakeholders_result = await db.execute(
        select(ReleaseStakeholder).where(
            ReleaseStakeholder.release_id == criteria.release_id
        )
    )
    stakeholders = stakeholders_result.scalars().all()
    stakeholder_ids = {s.user_id for s in stakeholders}

    # If no stakeholders assigned, keep as pending
    if not stakeholder_ids:
        return CriteriaStatus.PENDING

    # Get all non-revoked sign-offs for this criteria
    signoffs_result = await db.execute(
        select(SignOff).where(
            SignOff.criteria_id == criteria_id,
            SignOff.status != SignOffStatus.REVOKED,
        )
    )
    signoffs = signoffs_result.scalars().all()

    # Build map of user_id -> latest sign-off status
    user_signoff_status: Dict[int, SignOffStatus] = {}
    for signoff in signoffs:
        # Only consider sign-offs from assigned stakeholders
        if signoff.signed_by_id in stakeholder_ids:
            user_signoff_status[signoff.signed_by_id] = signoff.status

    # Check if any stakeholder rejected
    if SignOffStatus.REJECTED in user_signoff_status.values():
        return CriteriaStatus.REJECTED

    # Check if all stakeholders approved
    approved_count = sum(1 for status in user_signoff_status.values() if status == SignOffStatus.APPROVED)
    if approved_count == len(stakeholder_ids):
        return CriteriaStatus.APPROVED

    # Otherwise, still pending
    return CriteriaStatus.PENDING


async def get_stakeholder_signoff_summary(
    db: AsyncSession,
    criteria_id: int,
) -> Dict[int, Optional[Dict]]:
    """
    Get a summary of each stakeholder's sign-off status for a criteria.

    Returns:
        Dict mapping user_id to sign-off info (or None if not signed off)
    """
    # Get the criteria and its release
    criteria_result = await db.execute(
        select(ReleaseCriteria).where(ReleaseCriteria.id == criteria_id)
    )
    criteria = criteria_result.scalar_one()

    # Get all stakeholders for this release
    stakeholders_result = await db.execute(
        select(ReleaseStakeholder).where(
            ReleaseStakeholder.release_id == criteria.release_id
        )
    )
    stakeholders = stakeholders_result.scalars().all()

    # Get all non-revoked sign-offs for this criteria
    signoffs_result = await db.execute(
        select(SignOff).where(
            SignOff.criteria_id == criteria_id,
            SignOff.status != SignOffStatus.REVOKED,
        )
    )
    signoffs = signoffs_result.scalars().all()

    # Build summary
    summary = {}
    for stakeholder in stakeholders:
        user_signoff = next(
            (s for s in signoffs if s.signed_by_id == stakeholder.user_id),
            None
        )
        if user_signoff:
            summary[stakeholder.user_id] = {
                "status": user_signoff.status.value,
                "comment": user_signoff.comment,
                "link": user_signoff.link,
                "signed_at": user_signoff.signed_at,
            }
        else:
            summary[stakeholder.user_id] = None

    return summary
