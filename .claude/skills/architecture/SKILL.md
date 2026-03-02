---
name: architecture
description: Architecture overview, domain model, design decisions, and key assumptions for the Release Tracker application. Reference this when planning features, understanding the data model, or making architectural decisions.
---

# Release Tracker - Architecture & Design Assumptions

## What This App Does

Release Tracker is a multi-user release management tool with approval workflows. Teams create releases, define sign-off criteria, assign stakeholders, and collect approvals through a visual matrix interface. Think of it as a structured "release readiness checklist" where multiple people must sign off before a release ships.

## Domain Model

### Entity Hierarchy

```
Product
  └── Release (has status lifecycle)
        ├── ReleaseCriteria (sign-off items)
        │     └── SignOff (per-stakeholder approval/rejection)
        └── ReleaseStakeholder (assigned users)

Template (independent, reusable)
  └── TemplateCriteria (blueprint for release criteria)

User
  ├── is_admin flag (global admin)
  └── ProductPermission (product-level owner)
```

### Key Relationships
- A **Product** contains many **Releases**
- A **Release** has many **ReleaseCriteria** and many **ReleaseStakeholders**
- Each **ReleaseCriteria** can have many **SignOffs** (one per stakeholder)
- **Templates** are independent and reusable across products
- **Products** can have a default template
- **Users** connect to releases via the **ReleaseStakeholder** junction table

## Status Lifecycles

### Release Status
```
draft → in_review → approved → released
                  ↘ cancelled ↙
```

- **draft**: Initial state. Can add criteria, assign stakeholders. Can be deleted.
- **in_review**: Active sign-off collection. Stakeholders can approve/reject criteria.
- **approved**: All mandatory criteria approved. Ready for release.
- **released**: Shipped. Terminal state.
- **cancelled**: Abandoned. Can only cancel from in_review or approved.

**Important**: Only draft releases can be deleted (soft delete). Non-draft releases must be cancelled.

### Criteria Status (Computed)
```
pending → approved   (all stakeholders approved)
        → rejected   (any stakeholder rejected)
        → blocked    (manually set by admin/owner)
```

**Sign-off computation rules:**
1. ANY rejection by any stakeholder → criteria is **rejected**
2. ALL stakeholders approved → criteria is **approved**
3. Otherwise → **pending** (waiting for responses)
4. **blocked** is only set manually, never computed

### Sign-Off Status
- **approved**: Stakeholder approves the criteria
- **rejected**: Stakeholder rejects the criteria
- **revoked**: Previous sign-off was replaced (historical record)

When a stakeholder changes their sign-off, the old one is marked `revoked` and a new one is created. This preserves audit history.

## Permission Model

### Two-Tier Access Control

1. **Global Admin** (`user.is_admin = True`)
   - Full access to everything
   - Can manage users, products, all releases
   - Can impersonate other users (for testing sign-off workflows)

2. **Product Owner** (via `ProductPermission` table)
   - Can create/edit releases for their products
   - Can manage criteria and stakeholders on their product's releases
   - Can create templates
   - Cannot manage users or other products

3. **Regular User** (authenticated, no special permissions)
   - Can view all releases and products
   - Can sign off on criteria when assigned as stakeholder
   - Can view dashboard and audit logs

### Admin Impersonation
- Admin sends JWT + `X-User-Id` header to act as another user
- Used for testing sign-off workflows without multiple accounts
- Frontend stores `impersonateUserId` in localStorage
- Backend validates admin JWT before allowing impersonation

### Permission Evolution
The codebase has a deprecated `UserRole` enum (admin/product_owner/stakeholder). This is being replaced by:
- `user.is_admin` boolean for global admin
- `ProductPermission` table for per-product ownership
- Any authenticated user can be a stakeholder (assigned via `ReleaseStakeholder`)

## Sign-Off Matrix

The core UI is a matrix/grid showing:
- **Rows**: Release criteria (sign-off items)
- **Columns**: Assigned stakeholders
- **Cells**: Each stakeholder's sign-off status for each criteria

The matrix is the primary interface for tracking release readiness.

**Predefined criteria** (canonical order):
1. Content Review
2. Bug Verification
3. Smoke & Extended Smoke Regression
4. Full Regression
5. CPT Sign-off
6. Pre-Prod Monitoring incl. Crash Analysis
7. Production Monitoring
8. Security Audit

Custom criteria are sorted alphabetically after predefined ones.

**Link requirements**: Some criteria (Smoke & Extended Smoke Regression, Full Regression, CPT Sign-off) require a link when signing off. This is enforced server-side.

## Architecture Decisions

### Backend
- **FastAPI + async SQLAlchemy**: Chosen for async I/O performance and automatic OpenAPI docs
- **SQLite for dev, PostgreSQL for prod**: SQLite simplifies local development; PostgreSQL for production reliability
- **JWT authentication**: Stateless auth tokens, 7-day expiry, no refresh tokens
- **Google OAuth only**: No password-based auth. Users authenticate via Google, auto-created on first login
- **Audit logging in-app**: AuditLog table captures all state changes with actor, old/new values as JSON
- **Soft deletes**: Releases and templates are never hard-deleted to preserve audit trails

### Frontend
- **React Query for server state**: No Redux or global state management. React Query handles caching, refetching, and synchronization
- **Axios with interceptors**: Centralized token management and 401 handling
- **Tailwind + custom components**: Shadcn/ui-style component library built with CVA
- **AuthContext for auth state**: Single context provides user info, permissions, and impersonation control

### Database
- **No UUID primary keys**: Integer auto-increment for simplicity
- **Junction tables for M:N**: ReleaseStakeholder (release-user), ProductPermission (product-user)
- **Enum as string columns**: `native_enum=False` for SQLite compatibility
- **Timestamps on everything**: `created_at` and `updated_at` for debugging and audit

## Key Assumptions

1. **Single-tenant**: One deployment serves one organization. No multi-tenancy.
2. **Google-only auth**: All users have Google accounts. No local password auth.
3. **All users can view everything**: No data isolation between teams/products. Access control only restricts write operations.
4. **Stakeholders sign off on ALL criteria**: When assigned to a release, a stakeholder is expected to sign off on every criteria (the matrix is stakeholders x criteria, not selective assignment).
5. **Criteria status is computed, not manually set** (except "blocked"): Status derives from stakeholder sign-offs automatically.
6. **Templates are global**: Not scoped to products. Any template can be used for any product's release.
7. **One active sign-off per stakeholder per criteria**: Changing a sign-off revokes the previous one.
8. **Release deletion is rare**: Most releases progress through the lifecycle; cancellation is preferred over deletion.
9. **Audit trail is append-only**: Audit logs are never deleted or modified.
10. **nip.io for IP-based OAuth**: Since Google OAuth requires a domain, the app uses nip.io DNS for deployments without a custom domain (e.g., `35.238.75.135.nip.io`).

## API Design

- All endpoints under `/api` prefix
- RESTful conventions: `GET /releases`, `POST /releases`, `GET /releases/{id}`, `PUT /releases/{id}`, `DELETE /releases/{id}`
- Nested resources for tight ownership: `POST /releases/{id}/criteria`, `POST /criteria/{id}/sign-off`
- Filtering via query params: `GET /releases?product_id=1&status=in_review`
- Pagination: `skip` and `limit` query params (default limit=100)
- Swagger docs at `/api/docs`, ReDoc at `/api/redoc`

## File Organization Principle

Both backend and frontend follow **domain-based organization**:
- One file per domain entity (products, releases, templates, signoffs, users)
- Each domain has: model, schema, API route, API client function, React Query hook
- Shared utilities in dedicated directories (utils, services, lib)

When adding a new feature, create the corresponding files in each layer rather than adding to existing unrelated files.
