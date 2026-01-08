# Release Tracker - User Guide

A comprehensive guide to managing releases and sign-off workflows.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Setting Up Products & Templates](#setting-up-products--templates)
4. [Managing Users & Permissions](#managing-users--permissions)
5. [Creating a Release](#creating-a-release)
6. [Stakeholder Assignment](#stakeholder-assignment)
7. [Sign-off Workflow](#sign-off-workflow)
8. [Sign-Off Matrix](#sign-off-matrix)
9. [Viewing Release Status](#viewing-release-status)
10. [Audit & History](#audit--history)

---

## Getting Started

### Installation & Setup

#### Prerequisites
- Python 3.9 or higher
- Node.js 16 or higher
- npm

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv .venv
   ```

3. Activate the virtual environment:
   - macOS/Linux: `source .venv/bin/activate`
   - Windows: `.venv\Scripts\activate`

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Run database migrations:
   ```bash
   .venv/bin/alembic upgrade head
   ```

6. Start the server:
   ```bash
   .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Access Points

| Service | URL |
|---------|-----|
| Frontend UI | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |

### Navigation

The application has four main sections:

| Menu Item | Description |
|-----------|-------------|
| **Dashboard** | Overview of releases and pending sign-offs |
| **Releases** | List and manage all releases |
| **Products** | Manage products and their release templates |
| **Settings** | Manage users, permissions, view audit logs |

---

## Dashboard Overview

**Navigation:** Click **Dashboard** in the top nav (or visit `/`)

### Status Summary Cards
Five cards showing release counts by status:
- **Draft** - Releases being prepared
- **In Review** - Releases awaiting sign-offs
- **Approved** - Releases with all sign-offs complete
- **Released** - Deployed releases
- **Cancelled** - Cancelled releases

### My Pending Sign-offs
A list of criteria assigned to you that need your sign-off. Click any item to navigate directly to that release.

### Recent Releases
Quick access to the most recently created releases.

---

## Setting Up Products & Templates

### Create a Product

**Navigation:** Products (`/products`)

1. Click **Add Product**
2. Enter product details:
   - **Name** (required): e.g., "Web Application"
   - **Description** (optional)
3. Click **Create**

### Manage Product Owners

Each product can have multiple owners who can manage releases and assign stakeholders.

**Navigation:** Products → Select Product → **Manage Owners**

1. Click **Add Owner**
2. Select users to grant product owner permission
3. Click **Add**

Product owners can:
- Create and manage releases for that product
- Assign stakeholders to releases
- Manage release criteria

### Create a Template

Templates define sign-off criteria that will be copied to each release.

**Navigation:** Products → Select Product → **Add Template**

1. Enter template details:
   - **Name** (required): e.g., "Standard Release"
   - **Description** (optional)

2. Add sign-off criteria:
   - **Criteria name**: e.g., "Security Review"
   - **Description** (optional)
   - **Default owner** (optional)
   - **Required for approval** checkbox
   - Click **Add**

3. Click **Create Template**

### Predefined Criteria Order

The system includes predefined criteria that appear in a canonical order:

1. Content Review
2. Bug Verification
3. Smoke & Extended Smoke Regression
4. Full Regression
5. CPT Sign-off
6. Pre-Prod Monitoring incl. Crash Analysis
7. Production Monitoring
8. Security Audit

Custom criteria are sorted alphabetically after predefined criteria.

---

## Managing Users & Permissions

**Navigation:** Settings → Users (`/settings/users`)

### User Types

| Type | Badge | Description |
|------|-------|-------------|
| **System Admin** | Red | Full access to all products and releases |
| **Product Owner** | Blue | Can manage releases for assigned products |
| **User** | Gray | Can be assigned as stakeholder for releases |

### Adding a User

1. Click **Add User**
2. Enter details:
   - **Name** (required)
   - **Email** (required)
   - **System Administrator** checkbox (optional)
3. Click **Add User**

### Grant Product Owner Permission (Admin Only)

1. Find the user in the list
2. Click **Grant Access** in the Product Owner column
3. User can now manage releases for all products

### Revoke Product Owner Permission (Admin Only)

1. Find the user with Product Owner badge
2. Click the **Product Owner** button
3. Confirm revocation

### Deactivating a User

1. Click the deactivate icon
2. Confirm deactivation

Deactivated users cannot be assigned as stakeholders but historical sign-offs are preserved.

---

## Creating a Release

**Navigation:** Releases → **New Release**

### Step 1: Select Product
Choose the product for this release.

### Step 2: Select Template (Optional)
- **With template**: Criteria from template are copied
- **No template**: Add criteria manually later

### Step 3: Enter Details

| Field | Required | Description |
|-------|----------|-------------|
| Version | Yes | e.g., "2.1.0" |
| Release Name | Yes | e.g., "Q1 2024 Release" |
| Target Date | No | Expected release date |
| Description | No | Release notes |

### Step 4: Create
Click **Create Release** to create and open the release detail page.

**Note:** You are automatically assigned as a stakeholder when you create a release.

---

## Stakeholder Assignment

Stakeholders are users who must provide sign-offs on release criteria. Only admins and product owners can assign stakeholders.

### Assigning Stakeholders

**Navigation:** Release Detail → Stakeholders card

1. Click **Assign Stakeholder**
2. Select one or more users from the list
3. Click **Assign**

Selected users appear in the stakeholders list and can now sign off on criteria.

### Removing Stakeholders

1. Click the **X** button next to a stakeholder
2. Confirm removal

**Note:** Removing a stakeholder preserves their existing sign-offs in the audit trail, but those sign-offs no longer count toward criteria status.

### Permission Requirements

| Action | Required Role |
|--------|---------------|
| Assign Stakeholder | Admin or Product Owner |
| Remove Stakeholder | Admin or Product Owner |
| View Stakeholders | Any user |

If you see a disabled **Assign Stakeholder** button, you don't have the required permissions for this product.

---

## Sign-off Workflow

### Release States

```
Draft → In Review → Approved → Released
                 ↘ Cancelled
```

| State | Description |
|-------|-------------|
| **Draft** | Prepare release, add/modify criteria, assign stakeholders |
| **In Review** | Active sign-off collection |
| **Approved** | All mandatory criteria approved |
| **Released** | Deployed to production |
| **Cancelled** | Release cancelled |

### Deleting vs Cancelling

| Action | When Available | Behavior |
|--------|----------------|----------|
| **Delete** | Draft releases only | Soft delete - removes from list |
| **Cancel** | In Review or Approved releases | Status changes to Cancelled |

Draft releases can be deleted. Once a release moves to "In Review", it can only be cancelled, not deleted.

### Starting Review

1. Open a release in **Draft** status
2. Click **Start Review**
3. Stakeholders can now sign off

### Signing Off on Criteria

#### To Approve:
1. Click **Approve** or click on your cell in the sign-off matrix
2. Add optional comment
3. For certain criteria, a **test results link is required**:
   - Smoke & Extended Smoke Regression
   - Full Regression
   - CPT Sign-off
4. Confirm

#### To Reject:
1. Click **Reject**
2. Enter reason (required)
3. Confirm

#### Auto-Revoke Behavior
When you submit a new sign-off, any previous non-revoked sign-off you made for that criteria is automatically revoked. This ensures only your latest decision counts.

#### To Revoke:
1. Click **Revoke** on your previous sign-off
2. Criteria returns to **Pending** for you
3. Sign off again with new decision

### Approving the Release

When all **mandatory** criteria are approved by **all** stakeholders:
1. **Approve Release** button becomes active
2. Click to approve
3. Status changes to **Approved**

### Marking as Released

1. Open the approved release
2. Click **Mark as Released**

---

## Sign-Off Matrix

The sign-off matrix provides a visual grid showing all criteria vs all stakeholders.

### Matrix Layout

| | Stakeholder 1 | Stakeholder 2 | Status |
|---|---|---|---|
| **Criteria 1** | Approved | Pending | Pending |
| **Criteria 2** | Approved | Approved | Approved |
| **Criteria 3** | Rejected | - | Rejected |

### Color Coding

| Color | Meaning |
|-------|---------|
| Green | Approved |
| Red | Rejected |
| Yellow/Gray | Pending |

### Criteria Status Logic

The computed status for each criteria follows strict multi-user approval:

| Condition | Status |
|-----------|--------|
| ANY stakeholder rejected | **Rejected** |
| ALL stakeholders approved | **Approved** |
| Otherwise | **Pending** |

### Interacting with the Matrix

1. Click on any cell in your column to sign off
2. Click on any cell to view details (who, when, comment)
3. Current user can revoke their own sign-offs

---

## Viewing Release Status

### Release List

**Navigation:** Releases (`/releases`)

Features:
- **Search**: Filter by name or version
- **Status filter**: Show specific statuses
- **Product filter**: Show releases for a product

### Release Detail

**Navigation:** Click on any release

Sections:
1. **Header**: Name, version, status, actions
2. **Description**: Release notes
3. **Sign-off Progress**: Visual progress bars
4. **Criteria Manager**: Add/edit criteria (if permitted)
5. **Stakeholders**: Assigned users
6. **Sign-Off Matrix**: Criteria × Stakeholders grid
7. **Activity Timeline**: Recent activity

---

## Audit & History

### Release Activity Timeline

**Navigation:** Release Detail → Activity section

Shows recent activity including:

| Event Type | Actions Logged |
|------------|----------------|
| **Release** | Created, updated, status changes, deleted |
| **Criteria** | Added, updated, deleted |
| **Sign-offs** | Approved, rejected, revoked, auto-revoked |
| **Stakeholders** | Assigned, removed |

Each activity entry shows:
- Action icon (colored by type)
- Description of the action
- Timestamp
- Actor name (who performed the action)
- Optional comment (for sign-offs)
- Link to test results (if provided)

### Full Audit Log

**Navigation:** Settings → Audit Log (`/settings/audit`)

#### Filters

| Filter | Options |
|--------|---------|
| Entity Type | release, release_criteria, sign_off, product, template |
| Action | create, update, delete, sign_off, revoke |
| Entity ID | Specific entity ID |

#### Viewing Details

Click any row to see:
- **Previous Value**: State before change
- **New Value**: State after change

---

## Common Workflows

### First-Time Setup

1. **Settings → Users**: Add team members
2. **Products**: Create products
3. **Products → Add Template**: Create standard criteria
4. **Products → Manage Owners**: Assign product owners

### Standard Release Process

1. **Create release** from template
2. **Assign stakeholders** who need to sign off
3. **Start review** when ready
4. **Collect sign-offs** from all stakeholders
5. **Approve release** when all mandatory criteria pass
6. **Mark as released** after deployment

### Handling Rejections

1. Stakeholder clicks **Reject** with reason
2. Team addresses the issue
3. Stakeholder clicks **Revoke** then **Approve**

---

## Status Color Coding

| Color | Meaning |
|-------|---------|
| Gray | Draft / Pending |
| Yellow | In Review / Blocked |
| Green | Approved / Released |
| Red | Rejected / Cancelled |

---

## Troubleshooting

### "Assign Stakeholder" button is disabled
Your user doesn't have admin or product owner permissions for this product.

### Cannot sign off on criteria
You're not assigned as a stakeholder to this release. Ask an admin to assign you.

### Sign-off matrix not showing
No stakeholders have been assigned yet. Assign at least one stakeholder.

### Cannot approve release
Not all mandatory criteria have been approved by all stakeholders. Check the progress section.

### Sign-off button not appearing
The release must be in "In Review" status. Click "Start Review" first.

---

## API Documentation

For developers and integrations:
- **Swagger UI**: http://localhost:8000/docs
- **API Reference**: [BACKEND_API_DOCUMENTATION.md](./BACKEND_API_DOCUMENTATION.md)
