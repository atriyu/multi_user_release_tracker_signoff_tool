# Release Tracker - User Guide

A comprehensive guide to managing releases and sign-off workflows.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Setting Up Products & Templates](#setting-up-products--templates)
4. [Managing Users](#managing-users)
5. [Creating a Release](#creating-a-release)
6. [Sign-off Workflow](#sign-off-workflow)
7. [Viewing Release Status](#viewing-release-status)
8. [Audit & History](#audit--history)

---

## Getting Started

### Installation & Setup

#### Prerequisites
- Python 3.11 or higher
- Node.js 16 or higher
- npm or yarn

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (if not already created):
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

5. Run database migrations (if needed):
   ```bash
   alembic upgrade head
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

### Launching the Application

#### Starting the Backend

From the `backend` directory:

```bash
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at:
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc
- Health check: http://localhost:8000/health

#### Starting the Frontend

From the `frontend` directory:

```bash
npm run dev
```

The frontend UI will be available at:
- UI: http://localhost:5173/

> **Note:** Both services need to be running simultaneously for the application to work properly. You can run them in separate terminal windows or use a process manager.

### Navigation

The application has four main sections accessible from the top navigation bar:

| Menu Item | Description |
|-----------|-------------|
| **Dashboard** | Overview of releases and pending sign-offs |
| **Releases** | List and manage all releases |
| **Products** | Manage products and their release templates |
| **Settings** | Manage users, view audit logs, and system configuration |

---

## Dashboard Overview

**Navigation:** Click **Dashboard** in the top nav (or visit `/`)

The dashboard provides a quick overview of your release management status:

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

Before creating releases, you need to set up at least one product and optionally create templates.

### Step 1: Create a Product

**Navigation:** Products (`/products`)

1. Click **Add Product** button
2. Enter product details:
   - **Name** (required): e.g., "Web Application", "Mobile App"
   - **Description** (optional): Brief description of the product
3. Click **Create**

The product appears in the left sidebar. Click on it to view details and manage templates.

### Step 2: Create a Template

Templates define the sign-off criteria that will be copied to each release. This ensures consistency across releases.

**Navigation:** Products → Select Product → **Add Template**

1. Click **Add Template** next to the Templates section
2. Enter template details:
   - **Name** (required): e.g., "Standard Release", "Hotfix"
   - **Description** (optional): When to use this template

3. Add sign-off criteria:
   - Enter **Criteria name**: e.g., "Security Review", "QA Sign-off"
   - Enter **Description** (optional): What needs to be verified
   - Select **Default owner** (optional): User responsible for this sign-off
   - Check **Required for approval** if this is mandatory
   - Click **Add** to add the criteria

4. Repeat step 3 for all criteria
5. Click **Create Template**

### Editing Templates

**Navigation:** Products → Select Product → Click **Edit** on a template

From the template editor you can:
- Update template name and description
- Toggle template active/inactive status
- Add new criteria
- Delete existing criteria

> **Note:** Changes to templates only affect future releases. Existing releases keep their original criteria.

---

## Managing Users

Users are individuals who can be assigned as stakeholders for releases and sign off on criteria.

**Navigation:** Settings → Users (`/settings/users`)

### User Types

The system has three types of users:

| Type | Badge Color | Description |
|------|-------------|-------------|
| **System Admin** | Red | Full access to all products, releases, and users |
| **Product Owner** | Blue | Can manage releases, templates, and criteria for all products |
| **User** | Gray | Regular user who can be assigned as stakeholder for releases |

### Adding a User

1. Click **Add User**
2. Enter user details:
   - **Name** (required): Full name
   - **Email** (required): Email address
   - **System Administrator** (checkbox): Check if user should have admin access
3. Click **Add User**

> **Note:** New users are created as regular users by default. Admins can grant Product Owner permission after creation.

### Managing Product Owner Permissions (Admin Only)

Product Owner permission allows users to:
- Create and manage releases
- Create and edit templates
- Add/delete sign-off criteria
- Assign stakeholders to releases

**To Grant Product Owner Permission:**
1. Find the user in the list
2. Locate the "Product Owner" column
3. Click **Grant Access** button
4. Confirm the action
5. User's type badge changes to "Product Owner"

**To Revoke Product Owner Permission:**
1. Find the user with Product Owner permission
2. Click the **Product Owner** button (with shield icon)
3. Confirm the revocation
4. User's type badge changes to "User"

> **Note:** System Admins cannot have their permissions changed and show "N/A (Admin)" in the Product Owner column.

### User Table Columns

| Column | Description |
|--------|-------------|
| Name | User's full name |
| Email | User's email address |
| Type | User type badge (Admin/Product Owner/User) |
| Product Owner | Permission management button (Admin only) |
| Status | Active or Inactive status |
| Created | Date user was added to the system |
| Actions | Deactivate button (trash icon) |

### Deactivating a User

1. Find the user in the list
2. Click the deactivate icon (user with X)
3. Confirm deactivation

> **Note:** Deactivated users cannot be assigned as stakeholders but their historical sign-offs are preserved.

### Viewing Inactive Users

Toggle **Show inactive users** checkbox to include deactivated users in the list.

---

## Creating a Release

**Navigation:** Releases → **New Release** button (or Dashboard → **Create Release**)

### Step 1: Select Product

Choose the product this release belongs to from the dropdown.

### Step 2: Select Template (Optional)

If templates exist for the selected product, you can:
- **Select a template**: Criteria from the template will be copied to the release
- **No template**: Start with a blank release and add criteria manually later

### Step 3: Enter Release Details

| Field | Required | Description |
|-------|----------|-------------|
| Version | Yes | Version number (e.g., "2.1.0", "3.0.0-beta") |
| Release Name | Yes | Human-readable name (e.g., "Q1 2024 Release") |
| Target Date | No | Expected release date |
| Description | No | Release notes or summary |

### Step 4: Create

Click **Create Release** to create the release. You'll be redirected to the release detail page.

---

## Sign-off Workflow

The sign-off workflow moves a release through these states:

```
Draft → In Review → Approved → Released
                 ↘ Cancelled
```

### Release States

| State | Description |
|-------|-------------|
| **Draft** | Initial state. Prepare the release, add/modify criteria |
| **In Review** | Active sign-off collection. Stakeholders can approve/reject criteria |
| **Approved** | All mandatory criteria approved. Ready for deployment |
| **Released** | Deployed to production |
| **Cancelled** | Release cancelled (can be done from any state) |

### Starting the Review Process

**Navigation:** Releases → Click on a release → **Start Review** button

1. Open a release in **Draft** status
2. Click **Start Review**
3. Status changes to **In Review**
4. Stakeholders can now sign off on criteria

### Signing Off on Criteria

**Navigation:** Release Detail page → Sign-off Criteria section

Each criteria shows:
- **Name and description**
- **Required/Optional** badge
- **Current status** (Pending, Approved, Rejected, Blocked)
- **Action buttons**

#### To Approve a Criteria:

1. Click **Approve** button next to the pending criteria
2. (Optional) Add a comment
3. Click **Approve** to confirm

#### To Reject a Criteria:

1. Click **Reject** button
2. Enter a reason for rejection (required)
3. Click **Reject** to confirm

#### To Revoke a Sign-off:

If you need to change your decision:
1. Click **Revoke** next to an approved/rejected criteria
2. The criteria returns to **Pending** status
3. You can then approve or reject again

### Progress Tracking

The **Sign-off Progress** section shows:
- **Mandatory**: X of Y approved (with percentage bar)
- **Optional**: X of Y approved (with percentage bar)

### Approving the Release

Once all **mandatory** criteria are approved:

1. The **Approve Release** button becomes active
2. Click **Approve Release**
3. Status changes to **Approved**

### Marking as Released

After the release is deployed:

1. Open the approved release
2. Click **Mark as Released**
3. Status changes to **Released**

---

## Viewing Release Status

### Release List

**Navigation:** Releases (`/releases`)

Features:
- **Search**: Filter by release name or version
- **Status filter**: Show only specific statuses
- **Product filter**: Show releases for a specific product

Each release card shows:
- Release name and version
- Current status badge
- Target date (if set)
- Creation date

Click any card to view full details.

### Release Detail

**Navigation:** Releases → Click on a release

The detail page shows:

1. **Header**
   - Release name, version, status
   - Target date
   - Action buttons based on current state

2. **Description** (if provided)

3. **Sign-off Progress**
   - Visual progress bars for mandatory and optional criteria

4. **Sign-off Criteria**
   - Full list of criteria with status and actions

5. **Activity Timeline**
   - Recent activity on this release
   - Shows who did what and when

---

## Audit & History

### Release Activity Timeline

**Navigation:** Release Detail page → Activity section

Shows recent activity for the specific release:
- Release created/updated
- Criteria added
- Sign-offs recorded
- Status changes

### Full Audit Log

**Navigation:** Settings → Audit Log (`/settings/audit`)

Searchable log of all system activity:

#### Filters

| Filter | Options |
|--------|---------|
| Entity Type | release, release_criteria, sign_off, product, template |
| Action | create, update, delete, sign_off, revoke |
| Entity ID | Specific entity ID number |

#### Viewing Details

Click any row to expand and see:
- **Previous Value**: State before the change (for updates)
- **New Value**: State after the change

---

## Common Workflows

### Workflow 1: First-Time Setup

1. **Settings → Users**: Add team members who will sign off
2. **Products**: Create your product(s)
3. **Products → Add Template**: Create templates with standard criteria

### Workflow 2: Standard Release Process

1. **Releases → New Release**: Create release from template
2. **Release Detail → Start Review**: Begin sign-off collection
3. **Stakeholders sign off**: Each owner approves their criteria
4. **Release Detail → Approve Release**: When all mandatory criteria pass
5. **Release Detail → Mark as Released**: After deployment

### Workflow 3: Handling Rejections

1. Stakeholder clicks **Reject** with reason
2. Release manager reviews rejection reason
3. Team addresses the issue
4. Stakeholder clicks **Revoke** then **Approve**
5. Process continues

### Workflow 4: Auditing Past Releases

1. **Releases**: Use filters to find the release
2. **Release Detail**: View current state and activity
3. **Settings → Audit Log**: For detailed change history

---

## Quick Reference

### Keyboard Shortcuts

Currently, the application is fully mouse/touch driven. Keyboard shortcuts may be added in future versions.

### Status Color Coding

| Color | Meaning |
|-------|---------|
| Gray | Draft / Pending |
| Yellow | In Review / Blocked |
| Green | Approved / Released |
| Red | Rejected / Cancelled |

### Icons

| Icon | Meaning |
|------|---------|
| ✓ (Check) | Approved |
| ✗ (X) | Rejected |
| ↺ (Rotate) | Revoke action |
| ! (Alert) | Blocked |

---

## Troubleshooting

### "No products found" when creating a release
→ Go to Products and create at least one product first.

### "No templates" shown for a product
→ Templates are optional. You can create a release without a template and add criteria manually, or create a template first in Products.

### Cannot approve a release
→ All **mandatory** criteria (marked as "Required") must be approved first. Check the progress section for pending items.

### Sign-off button not appearing
→ The release must be in "In Review" status. Click "Start Review" first if the release is in "Draft".

---

## API Documentation

For developers and integrations, the API documentation is available at:
- **Swagger UI**: `http://localhost:8000/api/docs`
- **ReDoc**: `http://localhost:8000/api/redoc`
