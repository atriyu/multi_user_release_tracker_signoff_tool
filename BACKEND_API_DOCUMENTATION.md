# Multi-User Sign-Off Backend API Documentation

## Overview
The backend now supports **multi-user approval workflow** where each assigned stakeholder must individually approve release criteria.

## New Endpoints

### Stakeholder Management

#### 1. Assign Stakeholders to Release
```
POST /api/releases/{release_id}/stakeholders
```

**Auth**: Admin or Product Owner

**Request Body**:
```json
{
  "user_ids": [1, 2, 3]
}
```

**Response**: `201 Created`
```json
[
  {
    "id": 1,
    "release_id": 1,
    "user_id": 1,
    "assigned_at": "2026-01-03T05:00:00Z"
  }
]
```

**Notes**:
- Skips duplicates automatically
- Validates all user IDs exist

---

#### 2. List Release Stakeholders
```
GET /api/releases/{release_id}/stakeholders
```

**Auth**: Admin or Product Owner

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "release_id": 1,
    "user_id": 1,
    "assigned_at": "2026-01-03T05:00:00Z",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "stakeholder"
    }
  }
]
```

---

#### 3. Remove Stakeholder from Release
```
DELETE /api/releases/{release_id}/stakeholders/{user_id}
```

**Auth**: Admin or Product Owner

**Response**: `204 No Content`

**Notes**:
- Removing a stakeholder does NOT delete their sign-offs (audit trail preserved)
- Their sign-offs will no longer count toward criteria status computation

---

#### 4. Get Sign-Off Matrix
```
GET /api/releases/{release_id}/sign-off-matrix
```

**Auth**: Any authenticated user

**Response**: `200 OK`
```json
{
  "release_id": 1,
  "stakeholders": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "stakeholder"
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "stakeholder"
    }
  ],
  "criteria_matrix": [
    {
      "criteria_id": 1,
      "criteria_name": "Security Review",
      "is_mandatory": true,
      "computed_status": "approved",
      "stakeholder_signoffs": [
        {
          "user_id": 1,
          "user_name": "John Doe",
          "user_email": "john@example.com",
          "status": "approved",
          "comment": "Security checks passed",
          "link": null,
          "signed_at": "2026-01-02T10:00:00Z"
        },
        {
          "user_id": 2,
          "user_name": "Jane Smith",
          "user_email": "jane@example.com",
          "status": "approved",
          "comment": "LGTM",
          "link": null,
          "signed_at": "2026-01-02T11:00:00Z"
        }
      ]
    }
  ]
}
```

**Notes**:
- This is the primary endpoint for building the sign-off matrix UI
- Shows complete picture: which stakeholders have signed off on which criteria
- `status` can be: `"approved"`, `"rejected"`, or `null` (not signed off yet)

---

## Modified Endpoints

### 1. Create Sign-Off
```
POST /api/criteria/{criteria_id}/sign-off
```

**Auth**: ANY authenticated user (changed from Admin/Product Owner)

**Behavior Changes**:
- ✅ Validates user is assigned as stakeholder to the release
- ✅ Auto-revokes user's previous sign-off for this criteria (if exists)
- ✅ Computes new criteria status based on ALL stakeholder sign-offs
- ✅ Returns `403 Forbidden` if user not assigned as stakeholder

**Request/Response**: Unchanged

---

### 2. Revoke Sign-Off
```
DELETE /api/criteria/{criteria_id}/sign-off
```

**Auth**: ANY authenticated user (changed from Admin/Product Owner)

**Behavior Changes**:
- ✅ User can only revoke their OWN sign-off
- ✅ Recomputes criteria status after revocation
- ✅ Criteria may go back to "pending" if not all stakeholders approved

---

### 3. Get Release Detail
```
GET /api/releases/{release_id}
```

**Response Changes**:
```json
{
  "id": 1,
  "...": "...",
  "stakeholders": [
    {
      "id": 1,
      "release_id": 1,
      "user_id": 1,
      "assigned_at": "2026-01-03T05:00:00Z",
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "role": "stakeholder"
      }
    }
  ]
}
```

**Notes**:
- Now includes `stakeholders` array
- Stakeholders are eagerly loaded with user details

---

## Criteria Status Computation

### New Logic (Strict Multi-User Approval)

A criteria's status is **computed** based on all stakeholder sign-offs:

| Condition | Status |
|-----------|--------|
| ANY stakeholder rejected | `rejected` |
| ALL stakeholders approved | `approved` |
| Otherwise | `pending` |

**Examples**:

| Stakeholder A | Stakeholder B | Stakeholder C | Result |
|--------------|--------------|--------------|---------|
| approved | approved | approved | **approved** |
| approved | approved | (not signed) | **pending** |
| approved | rejected | approved | **rejected** |
| (not signed) | (not signed) | (not signed) | **pending** |

---

## Database Changes

### New Table: `release_stakeholders`

```sql
CREATE TABLE release_stakeholders (
    id INTEGER PRIMARY KEY,
    release_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (release_id, user_id)
);
```

---

## Migration Notes

### Existing Data
The migration automatically assigns stakeholders based on existing sign-offs:
- Users who have previously signed off on any criteria in a release are assigned as stakeholders

### Backward Compatibility
- Existing sign-offs are preserved
- Criteria status is recomputed using new logic
- No frontend changes required immediately (graceful degradation)

---

## Frontend Integration Checklist

### Required Changes
1. ✅ Add stakeholder assignment UI to release creation/edit
2. ✅ Build sign-off matrix view (criteria × stakeholders grid)
3. ✅ Update criteria checklist to show multi-user status
4. ✅ Update dashboard to show per-stakeholder progress
5. ✅ Add "My Releases" filter for stakeholders

### API Client Functions Needed
```typescript
// Stakeholder management
assignStakeholders(releaseId: number, userIds: number[])
removeStakeholder(releaseId: number, userId: number)
getStakeholders(releaseId: number)

// Sign-off matrix
getSignOffMatrix(releaseId: number)
```

### TypeScript Types Needed
```typescript
interface ReleaseStakeholder {
  id: number;
  release_id: number;
  user_id: number;
  assigned_at: string;
  user: StakeholderUser;
}

interface StakeholderUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface SignOffMatrix {
  release_id: number;
  stakeholders: StakeholderUser[];
  criteria_matrix: CriteriaSignOffRow[];
}

interface CriteriaSignOffRow {
  criteria_id: number;
  criteria_name: string;
  is_mandatory: boolean;
  computed_status: CriteriaStatus;
  stakeholder_signoffs: StakeholderSignOffStatus[];
}

interface StakeholderSignOffStatus {
  user_id: number;
  user_name: string;
  user_email: string;
  status: 'approved' | 'rejected' | null;
  comment: string | null;
  link: string | null;
  signed_at: string | null;
}
```

---

## Testing the API

### 1. Assign Stakeholders
```bash
curl -X POST -H "X-User-Id: 1" -H "Content-Type: application/json" \
  -d '{"user_ids": [1, 2, 3]}' \
  http://localhost:8000/api/releases/1/stakeholders
```

### 2. Get Sign-Off Matrix
```bash
curl -H "X-User-Id: 1" \
  http://localhost:8000/api/releases/1/sign-off-matrix
```

### 3. Create Sign-Off (as stakeholder)
```bash
curl -X POST -H "X-User-Id: 2" -H "Content-Type: application/json" \
  -d '{"status": "approved", "comment": "Looks good!"}' \
  http://localhost:8000/api/criteria/1/sign-off
```

---

---

## User Permission Management

### New Endpoints (Added 2026-01-04)

#### 1. Grant Product Owner Permission
```
POST /api/users/{user_id}/grant-product-owner
```

**Auth**: Admin only

**Description**: Grants Product Owner permission to a user for ALL products. This creates `ProductPermission` records for every product in the system.

**Response**: `200 OK`
```json
{
  "message": "Product owner permission granted successfully"
}
```

**Notes**:
- Auto-syncs user's role to `product_owner`
- Creates permissions for all existing products
- Skips if user already has permission for a product
- Returns error if user is already an admin

**Example**:
```bash
curl -X POST -H "X-User-Id: 1" \
  http://localhost:8000/api/users/2/grant-product-owner
```

---

#### 2. Revoke Product Owner Permission
```
DELETE /api/users/{user_id}/revoke-product-owner
```

**Auth**: Admin only

**Description**: Revokes ALL Product Owner permissions from a user by deleting all their `ProductPermission` records.

**Response**: `200 OK`
```json
{
  "message": "Product owner permission revoked successfully"
}
```

**Notes**:
- Deletes all product permissions for the user
- Auto-syncs user's role back to `stakeholder`
- Preserves historical sign-offs
- Cannot revoke permissions from system admins

**Example**:
```bash
curl -X DELETE -H "X-User-Id: 1" \
  http://localhost:8000/api/users/2/revoke-product-owner
```

---

#### 3. Check Product Owner Status
```
GET /api/users/{user_id}/is-product-owner
```

**Auth**: Admin only

**Description**: Checks if a user has Product Owner permission (i.e., has any product permissions).

**Response**: `200 OK`
```json
{
  "is_product_owner": true
}
```

**Notes**:
- Returns `true` if user has permissions for at least one product
- Returns `false` if user has no product permissions
- System admins are NOT considered product owners (they have higher permissions)

**Example**:
```bash
curl -H "X-User-Id: 1" \
  http://localhost:8000/api/users/2/is-product-owner
```

---

## Permission System Summary

### User Types

| Type | Implemented Via | Permissions |
|------|-----------------|-------------|
| **System Admin** | `User.is_admin = true` | Full access to everything |
| **Product Owner** | `ProductPermission` records | Manage releases, templates, criteria for all products |
| **Stakeholder/User** | Default | Can be assigned to releases and sign off on criteria |

### Permission Flow

```
1. Admin creates user → is_admin = false, no permissions
2. Admin grants Product Owner permission → ProductPermission records created for ALL products
3. User can now manage releases/templates
4. Admin revokes permission → ProductPermission records deleted
5. User returns to regular stakeholder role
```

### Auto-Sync Behavior

The deprecated `role` field is automatically synced:
- `is_admin = true` → `role = 'admin'`
- Has product permissions → `role = 'product_owner'`
- No permissions → `role = 'stakeholder'`

---

## Next Steps

1. **Email Notifications** (Future)
   - Notify stakeholders when assigned to release
   - Notify when all criteria ready for their sign-off
   - Notify when release approved
   - Notify user when granted Product Owner permission

2. **Permission Audit Log** (Future)
   - Log when permissions are granted/revoked
   - Show who granted the permission
   - Track permission history

3. **Per-Product Permissions** (Future Enhancement)
   - Allow granting Product Owner permission for specific products only
   - More granular control
   - Useful for large organizations with many products

---

## Backend Completion Status

✅ Database schema (100%)
✅ Models and relationships (100%)
✅ Business logic (100%)
✅ Multi-user approval endpoints (100%)
✅ User permission endpoints (100%)
✅ Route registration (100%)
✅ Testing (100%)

**Backend is production-ready for multi-user approval workflow with permission management!**
