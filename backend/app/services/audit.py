from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        entity_type: str,
        entity_id: int,
        action: str,
        actor_id: int | None = None,
        old_value: dict | None = None,
        new_value: dict | None = None,
    ):
        audit_entry = AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor_id=actor_id,
            old_value=old_value,
            new_value=new_value,
        )
        self.db.add(audit_entry)
        await self.db.flush()
        return audit_entry

    async def log_create(
        self,
        entity_type: str,
        entity_id: int,
        new_value: dict,
        actor_id: int | None = None,
    ):
        return await self.log(
            entity_type=entity_type,
            entity_id=entity_id,
            action="create",
            actor_id=actor_id,
            new_value=new_value,
        )

    async def log_update(
        self,
        entity_type: str,
        entity_id: int,
        old_value: dict,
        new_value: dict,
        actor_id: int | None = None,
    ):
        return await self.log(
            entity_type=entity_type,
            entity_id=entity_id,
            action="update",
            actor_id=actor_id,
            old_value=old_value,
            new_value=new_value,
        )

    async def log_delete(
        self,
        entity_type: str,
        entity_id: int,
        old_value: dict,
        actor_id: int | None = None,
    ):
        return await self.log(
            entity_type=entity_type,
            entity_id=entity_id,
            action="delete",
            actor_id=actor_id,
            old_value=old_value,
        )

    async def log_sign_off(
        self,
        criteria_id: int,
        sign_off_id: int,
        action: str,
        actor_id: int | None = None,
        details: dict | None = None,
    ):
        return await self.log(
            entity_type="sign_off",
            entity_id=sign_off_id,
            action=action,
            actor_id=actor_id,
            new_value={"criteria_id": criteria_id, **(details or {})},
        )
