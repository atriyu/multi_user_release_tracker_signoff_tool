# Backend API Documentation

Complete API reference for the Release Tracker backend.

## Base URL

```
http://localhost:8000/api
```

## Authentication

All endpoints require a user ID header:

```
X-User-Id: <user_id>
```

## Endpoints

### Releases

#### List Releases
```
GET /releases
```

**Query Parameters:**
- `product_id` (optional): Filter by product
- `status` (optional): Filter by status

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "product_id": 1,
    "template_id": 1,
    "version": "1.0.0",
    "name": "Initial Release",
    "description": "First release",
    "status": "draft",
    "target_date": "2024-01-15",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Get Release Detail
```
GET /releases/{release_id}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "product_id": 1,
  "version": "1.0.0",
  "name": "Initial Release",
  "status": "in_review",
  "criteria": [...],
  "progress": {
    "mandatory_total": 3,
    "mandatory_approved": 2,
    "mandatory_percent": 66.67,
    "optional_total": 1,
    "optional_approved": 0,
    "optional_percent": 0,
    "all_mandatory_approved": false
  },
  "stakeholders": [
    {
      "id": 1,
      "release_id": 1,
      "user_id": 2,
      "assigned_at": "2024-01-02T00:00:00Z",
      "user": {
        "id": 2,
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

#### Create Release
```
POST /releases
```

**Auth:** Admin or Product Owner

**Request Body:**
```json
{
  "product_id": 1,
  "template_id": 1,
  "version": "1.0.0",
  "name": "Initial Release",
  "description": "First release",
  "target_date": "2024-01-15"
}
```

#### Update Release
```
PATCH /releases/{release_id}
```

**Auth:** Admin or Product Owner

**Request Body:**
```json
{
  "status": "in_review",
  "target_date": "2024-01-20"
}
```

#### Delete Release
```
DELETE /releases/{release_id}
```

**Auth:** Admin or Product Owner

---

### Stakeholders

#### Assign Stakeholders
```
POST /releases/{release_id}/stakeholders
```

**Auth:** Admin or Product Owner

**Request Body:**
```json
{
  "user_ids": [1, 2, 3]
}
```

**Response:** `201 Created`
```json
[
  {
    "id": 1,
    "release_id": 1,
    "user_id": 1,
    "assigned_at": "2024-01-03T00:00:00Z"
  }
]
```

**Notes:**
- Skips duplicates automatically
- Validates all user IDs exist

#### List Stakeholders
```
GET /releases/{release_id}/stakeholders
```

**Auth:** Admin or Product Owner

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "release_id": 1,
    "user_id": 1,
    "assigned_at": "2024-01-03T00:00:00Z",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
]
```

#### Remove Stakeholder
```
DELETE /releases/{release_id}/stakeholders/{user_id}
```

**Auth:** Admin or Product Owner

**Response:** `204 No Content`

**Notes:**
- Removing a stakeholder preserves their sign-offs (audit trail)
- Sign-offs no longer count toward criteria status

#### Get Sign-Off Matrix
```
GET /releases/{release_id}/sign-off-matrix
```

**Auth:** Any authenticated user

**Response:** `200 OK`
```json
{
  "release_id": 1,
  "stakeholders": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
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
          "comment": "LGTM",
          "link": null,
          "signed_at": "2024-01-02T10:00:00Z"
        }
      ]
    }
  ]
}
```

---

### Sign-offs

#### Create Sign-Off
```
POST /criteria/{criteria_id}/sign-off
```

**Auth:** Any authenticated user (must be assigned stakeholder)

**Request Body:**
```json
{
  "status": "approved",
  "comment": "Looks good!",
  "link": "https://example.com/evidence"
}
```

**Response:** `201 Created`

**Behavior:**
- Validates user is assigned as stakeholder
- Auto-revokes previous sign-off for this criteria (if exists)
- Recomputes criteria status based on all stakeholder sign-offs
- Returns `403 Forbidden` if user not assigned as stakeholder

#### Revoke Sign-Off
```
DELETE /criteria/{criteria_id}/sign-off
```

**Auth:** Any authenticated user (own sign-off only)

**Response:** `204 No Content`

**Behavior:**
- User can only revoke their OWN sign-off
- Recomputes criteria status after revocation

---

### Criteria Status Logic

The computed status for each criteria:

| Condition | Status |
|-----------|--------|
| ANY stakeholder rejected | `rejected` |
| ALL stakeholders approved | `approved` |
| Otherwise | `pending` |

**Examples:**

| Stakeholder A | Stakeholder B | Stakeholder C | Result |
|--------------|--------------|--------------|---------|
| approved | approved | approved | **approved** |
| approved | approved | (pending) | **pending** |
| approved | rejected | approved | **rejected** |

---

### Release Criteria

#### Add Criteria
```
POST /releases/{release_id}/criteria
```

**Auth:** Admin or Product Owner

**Request Body:**
```json
{
  "name": "Security Review",
  "description": "Security team review",
  "is_mandatory": true,
  "owner_id": 1,
  "order": 1
}
```

#### Update Criteria
```
PATCH /criteria/{criteria_id}
```

**Auth:** Admin or Product Owner

#### Delete Criteria
```
DELETE /criteria/{criteria_id}
```

**Auth:** Admin or Product Owner

---

### User Permission Management

#### Grant Product Owner Permission
```
POST /users/{user_id}/grant-product-owner
```

**Auth:** Admin only

**Description:** Grants Product Owner permission for ALL products.

**Response:** `200 OK`
```json
{
  "message": "Product owner permission granted successfully"
}
```

#### Revoke Product Owner Permission
```
DELETE /users/{user_id}/revoke-product-owner
```

**Auth:** Admin only

**Description:** Revokes ALL Product Owner permissions.

**Response:** `200 OK`
```json
{
  "message": "Product owner permission revoked successfully"
}
```

#### Check Product Owner Status
```
GET /users/{user_id}/is-product-owner
```

**Auth:** Admin only

**Response:** `200 OK`
```json
{
  "is_product_owner": true
}
```

---

### Product Permissions

#### Grant Product Permissions
```
POST /products/{product_id}/permissions
```

**Auth:** Admin only

**Request Body:**
```json
{
  "user_ids": [1, 2, 3],
  "permission_type": "product_owner"
}
```

#### List Product Permissions
```
GET /products/{product_id}/permissions
```

**Auth:** Admin only

#### Revoke Product Permission
```
DELETE /products/{product_id}/permissions/{user_id}
```

**Auth:** Admin only

---

### Users

#### List Users
```
GET /users
```

**Query Parameters:**
- `include_inactive` (optional): Include inactive users

#### Create User
```
POST /users
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "New User",
  "is_admin": false
}
```

#### Update User
```
PATCH /users/{user_id}
```

#### Get Current User
```
GET /users/me
```

---

### Products

#### List Products
```
GET /products
```

#### Create Product
```
POST /products
```

**Auth:** Admin only

#### Update Product
```
PATCH /products/{product_id}
```

**Auth:** Admin only

---

### Templates

#### List Templates
```
GET /templates
```

#### Create Template
```
POST /templates
```

**Auth:** Admin or Product Owner

#### Update Template
```
PATCH /templates/{template_id}
```

**Auth:** Admin or Product Owner

---

### Dashboard

#### Get Summary
```
GET /dashboard/summary
```

**Response:** `200 OK`
```json
{
  "total": 10,
  "by_status": {
    "draft": 2,
    "in_review": 3,
    "approved": 2,
    "released": 2,
    "cancelled": 1
  }
}
```

#### Get Pending Sign-offs
```
GET /dashboard/pending-signoffs
```

Returns criteria awaiting sign-off from the current user.

---

### Audit Log

#### List Audit Entries
```
GET /audit
```

**Query Parameters:**
- `entity_type` (optional): Filter by entity type
- `action` (optional): Filter by action
- `entity_id` (optional): Filter by entity ID

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid request body"
}
```

### 401 Unauthorized
```json
{
  "detail": "Missing X-User-Id header"
}
```

### 403 Forbidden
```json
{
  "detail": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

---

## Testing the API

### cURL Examples

**Assign Stakeholders:**
```bash
curl -X POST http://localhost:8000/api/releases/1/stakeholders \
  -H "X-User-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{"user_ids": [1, 2, 3]}'
```

**Get Sign-Off Matrix:**
```bash
curl http://localhost:8000/api/releases/1/sign-off-matrix \
  -H "X-User-Id: 1"
```

**Create Sign-Off:**
```bash
curl -X POST http://localhost:8000/api/criteria/1/sign-off \
  -H "X-User-Id: 2" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved", "comment": "LGTM"}'
```

**Grant Product Owner Permission:**
```bash
curl -X POST http://localhost:8000/api/users/2/grant-product-owner \
  -H "X-User-Id: 1"
```

---

## Interactive Documentation

Access the interactive API documentation at:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
