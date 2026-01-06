from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_, and_, cast, String
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User

router = APIRouter()


@router.get("/releases/{release_id}/history")
async def get_release_history(
    release_id: int,
    db: AsyncSession = Depends(get_db),
):
    # Get all audit logs with actor relationship
    result = await db.execute(
        select(AuditLog)
        .options(selectinload(AuditLog.actor))
        .order_by(AuditLog.timestamp.desc())
    )
    all_logs = result.scalars().all()

    # Filter in Python for SQLite compatibility
    filtered_logs = []
    for log in all_logs:
        # Direct release match
        if log.entity_type == "release" and log.entity_id == release_id:
            filtered_logs.append(log)
            continue

        # Check new_value for release_id
        if log.new_value and log.new_value.get("release_id") == release_id:
            filtered_logs.append(log)
            continue

        # Check old_value for release_id (for delete operations)
        if log.old_value and log.old_value.get("release_id") == release_id:
            filtered_logs.append(log)
            continue

    return [
        {
            "id": log.id,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "action": log.action,
            "actor_id": log.actor_id,
            "actor_name": log.actor.name if log.actor else None,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "timestamp": log.timestamp.isoformat(),
        }
        for log in filtered_logs
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
