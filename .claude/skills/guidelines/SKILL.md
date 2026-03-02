---
name: guidelines
description: Coding conventions, patterns, and best practices for the Release Tracker project. Reference this when writing or reviewing backend (FastAPI/Python) or frontend (React/TypeScript) code.
---

# Release Tracker - Coding Guidelines & Best Practices

Use these conventions when writing or modifying code in this project. These are the established patterns -- follow them for consistency.

## Backend (FastAPI + Python)

### API Route Pattern

Every route file follows this structure:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import RequireAdmin, RequireAnyRole, get_current_user
from app.services.audit import AuditService

router = APIRouter()

@router.get("/entities", response_model=List[EntityResponse])
async def list_entities(
    current_user: RequireAnyRole,           # Auth via type annotation
    db: AsyncSession = Depends(get_db),     # DB session injection
):
    ...
```

**Key rules:**
- All route handlers are `async def`
- Use `Depends()` for dependency injection (db sessions, auth)
- Auth is enforced via type annotations: `RequireAdmin`, `RequireAnyRole`, or `User = Depends(get_current_user)`
- Return Pydantic response models, never raw dicts
- Use `selectinload()` for eager loading relationships (prevents N+1 queries)
- Status codes: 201 for create, 204 for delete, 404 for not found, 403 for forbidden, 400 for validation

### Permission Checking

Three tiers of access control:
1. **`RequireAnyRole`** - Any authenticated user (read operations)
2. **`RequireAdmin`** - Admin-only operations (user management, product CRUD)
3. **Product-level check** - Admin OR product owner for that specific product (release/criteria management)

For product-level checks, use the established pattern:
```python
async def check_release_permission(user: User, release_id: int, db: AsyncSession):
    if user.is_admin:
        return
    # Check ProductPermission table for user+product combo
    # Raise 403 if no permission found
```

### Audit Logging

**Every state-changing operation MUST be audit logged.** Use `AuditService`:

```python
audit_service = AuditService(db)
await audit_service.log_create(entity_type="release", entity_id=obj.id, new_value=to_dict(obj), actor_id=user.id)
await audit_service.log_update(entity_type="release", entity_id=obj.id, old_value=old_dict, new_value=new_dict, actor_id=user.id)
await audit_service.log_delete(entity_type="release", entity_id=obj.id, old_value=old_dict, actor_id=user.id)
```

- Capture `old_value` BEFORE making changes
- Entity types: `"release"`, `"release_criteria"`, `"sign_off"`, `"template"`, `"product"`, `"user"`
- Values are plain dicts with primitive types (convert enums with `.value`)

### Soft Deletes

- Releases use `is_deleted = True` (never hard delete)
- Templates use `is_active = False` (deactivation)
- Always filter queries: `.where(Release.is_deleted == False)`
- Only draft releases can be deleted; in-review/approved must be cancelled

### Database Conventions

- All models extend `Base` from `app.database`
- Use `Mapped[type]` with `mapped_column()` (SQLAlchemy 2.0 style)
- Foreign keys: `{entity}_id` naming, always `index=True`
- Include `created_at` and `updated_at` on all models
- Status fields use Python `Enum` with `native_enum=False` for SQLite compatibility
- Relationships use `back_populates` (never `backref`)
- Cascade deletes for owned children: `cascade="all, delete-orphan"`

### Pydantic Schema Pattern

```python
class EntityCreate(BaseModel):     # For POST request body
    name: str
    description: Optional[str] = None

class EntityUpdate(BaseModel):     # For PUT request body (all fields optional)
    name: Optional[str] = None

class EntityResponse(BaseModel):   # For API responses
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    created_at: datetime
```

### Alembic Migrations

- Auto-generate: `alembic revision --autogenerate -m "description"`
- Always review generated migration before applying
- Run with: `.venv/bin/alembic upgrade head`
- Backup database before running migrations in production
- Each migration should be self-contained and reversible

---

## Frontend (React + TypeScript)

### API Layer Pattern

One file per domain in `src/api/`. Each exports plain async functions:

```typescript
// src/api/releases.ts
import api from './client';

export async function getReleases(params?: { product_id?: number }) {
  const { data } = await api.get('/releases', { params });
  return data;
}

export async function createRelease(payload: ReleaseCreatePayload) {
  const { data } = await api.post('/releases', payload);
  return data;
}
```

**Never call `api` (Axios) directly from components.** Always go through the API layer.

### React Query Hooks Pattern

One hook file per domain in `src/hooks/`. Wraps API functions with React Query:

```typescript
export function useReleases(params?: { product_id?: number }) {
  return useQuery({
    queryKey: ['releases', params],
    queryFn: () => api.getReleases(params),
  });
}

export function useCreateRelease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createRelease,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
    },
  });
}
```

**Critical: Query invalidation rules after mutations:**
- Invalidate the list query: `['releases']`
- Invalidate the detail query: `['release', id]`
- Invalidate the sign-off matrix: `['signOffMatrix', releaseId]`
- Invalidate the audit log: `['audit', 'release', id]`
- If a mutation affects multiple entities, invalidate ALL related queries

Query key conventions:
- List: `['entities']` or `['entities', filterParams]`
- Detail: `['entity', id]`
- Related: `['signOffMatrix', releaseId]`, `['audit', 'release', id]`

### Component Organization

```
src/
  components/
    ui/          # Base components (button, card, dialog, table, badge, input)
    release/     # Release-specific components
    criteria/    # Criteria components
    product/     # Product components
    dashboard/   # Dashboard widgets
  pages/         # Route-level components that own data fetching
```

- Pages own data fetching via hooks
- Components receive data via props
- UI components are generic and reusable

### TypeScript Conventions

- All types defined in `src/types/index.ts`
- Use `interface` for object shapes, `type` for unions/aliases
- Status types are string literal unions matching backend enum values
- Optional fields use `fieldName: Type | null` (matching API response)
- Payload types suffixed with `Payload` (e.g., `UserCreatePayload`)

### Auth Context Usage

```typescript
const { user, isAdmin, isProductOwner, canManageResources, impersonatingUserId } = useAuth();
```

- `isAdmin`: Show admin-only UI (user management, product CRUD)
- `isProductOwner`: Show product owner features (create releases, manage criteria)
- `canManageResources`: Admin OR product owner (most management operations)
- `impersonatingUserId`: Non-null when admin is impersonating another user

### Styling

- Tailwind CSS utility classes for all styling
- Shadcn/ui-style component variants via CVA (class-variance-authority)
- No inline styles; no separate CSS files for components
- Use `cn()` utility from `src/lib/utils.ts` for conditional classes

---

## General Rules

1. **Always use async/await** for database operations (never sync queries)
2. **Always validate permissions** before modifying data
3. **Always audit log** state changes
4. **Always invalidate related React Query caches** after mutations
5. **Never expose internal errors** to API responses -- use HTTPException with clear messages
6. **Soft delete** over hard delete for releases and templates
7. **Keep the sign-off matrix in sync** -- any change to criteria, stakeholders, or sign-offs must invalidate `['signOffMatrix', releaseId]`
