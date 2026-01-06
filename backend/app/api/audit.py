from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.audit import AuditLog

router = APIRouter()


@router.get("/releases/{release_id}/history")
async def get_release_history(
    release_id: int,
    db: AsyncSession = Depends(get_db),
):
    # Get all audit logs related to this release
    result = await db.execute(
        select(AuditLog)
        .where(
            (
                (AuditLog.entity_type == "release") & (AuditLog.entity_id == release_id)
            )
            | (
                (AuditLog.entity_type == "release_criteria")
                & (AuditLog.new_value["release_id"].astext == str(release_id))
            )
            | (
                (AuditLog.entity_type == "sign_off")
                & (AuditLog.new_value["release_id"].astext == str(release_id))
            )
        )
        .order_by(AuditLog.timestamp.desc())
    )
    logs = result.scalars().all()

    return [
        {
            "id": log.id,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "action": log.action,
            "actor_id": log.actor_id,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "timestamp": log.timestamp.isoformat(),
        }
        for log in logs
    ]


@router.get("/audit")
async def query_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    actor_id: Optional[int] = None,
    action: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog)

    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
    if actor_id:
        query = query.where(AuditLog.actor_id == actor_id)
    if action:
        query = query.where(AuditLog.action == action)

    query = query.offset(skip).limit(limit).order_by(AuditLog.timestamp.desc())
    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        {
            "id": log.id,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "action": log.action,
            "actor_id": log.actor_id,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "timestamp": log.timestamp.isoformat(),
        }
        for log in logs
    ]
