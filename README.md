# Release Tracker - Multi-User Sign-Off Tool

A comprehensive release management application with multi-user approval workflows, stakeholder assignment, and sign-off matrix tracking.

## Features

- **Multi-User Approval System**: Assign multiple stakeholders to releases, each providing independent sign-offs
- **Sign-Off Matrix**: Visual grid showing criteria vs stakeholders with approval status
- **Product-Based Permissions**: Admin and product owner roles with granular access control
- **Release Workflow**: Draft → In Review → Approved → Released status progression
- **Template System**: Create reusable criteria templates for consistent release processes
- **Audit Trail**: Complete history of all actions including sign-offs, stakeholder changes, criteria modifications, and status transitions

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite with SQLAlchemy ORM
- **Migrations**: Alembic

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: TanStack React Query
- **Styling**: Tailwind CSS
- **UI Components**: Custom component library (shadcn/ui style)

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- npm

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
source .venv/bin/activate  # macOS/Linux
# or
.venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Run database migrations
.venv/bin/alembic upgrade head

# Start the server
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at:
- API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at: http://localhost:5173

## Project Structure

```
release-tracker/
├── backend/
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   ├── dependencies/     # Auth & permissions
│   │   └── main.py           # FastAPI app
│   ├── alembic/              # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/              # API client functions
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Page components
│   │   ├── context/          # React context (auth)
│   │   └── types/            # TypeScript types
│   └── package.json
└── docs/                     # Documentation
```

## Permission System

The Release Tracker uses a **product-based permission model**:

### Permission Levels

| Level | Scope | Capabilities |
|-------|-------|--------------|
| **System Admin** | Global | Full access to all products, users, and settings |
| **Product Owner** | Per-product | Manage releases and assign stakeholders for assigned products |
| **Stakeholder** | Per-release | Sign off on criteria for assigned releases |

### How Permissions Work

1. **System Admins** have full access to everything
2. **Product Owner permission** is granted **per product** by an admin
   - A user can be product owner for multiple products
   - Product owners can only manage releases for products they have permission for
3. **Stakeholders** are assigned **per release** by product owners or admins
   - The release creator is automatically assigned as a stakeholder
   - Stakeholders can only sign off on releases they are assigned to

See [User Guide - Permission Model](./USER_GUIDE.md#understanding-the-permission-model) for detailed documentation.

## Multi-User Approval Workflow

### Sign-Off Logic

| Condition | Criteria Status |
|-----------|-----------------|
| ANY stakeholder rejected | **Rejected** |
| ALL stakeholders approved | **Approved** |
| Otherwise | **Pending** |

### Workflow Steps

1. **Create Release**: From a product template or blank (with optional candidate build)
2. **Assign Stakeholders**: Add users who need to sign off
3. **Start Review**: Move release to "In Review" status
4. **Collect Sign-offs**: Each stakeholder approves/rejects criteria
5. **Approve Release**: When all mandatory criteria are approved
6. **Mark Released**: After deployment

### Release Fields

| Field | Required | Editable | Description |
|-------|----------|----------|-------------|
| Version | Yes | No | Release version number |
| Name | Yes | No | Release name/title |
| Target Date | No | Draft, In Review | Expected release date |
| Candidate Build | No | Draft, In Review | Build identifier for tracking |
| Description | No | No | Release notes |

## API Endpoints

### Stakeholder Management

```bash
# Assign stakeholders
POST /api/releases/{release_id}/stakeholders
Body: { "user_ids": [1, 2, 3] }

# List stakeholders
GET /api/releases/{release_id}/stakeholders

# Remove stakeholder
DELETE /api/releases/{release_id}/stakeholders/{user_id}

# Get sign-off matrix
GET /api/releases/{release_id}/sign-off-matrix
```

### Sign-offs

```bash
# Create sign-off
POST /api/criteria/{criteria_id}/sign-off
Body: { "status": "approved", "comment": "LGTM", "link": "https://test-results.example.com/run/123" }

# Revoke sign-off
DELETE /api/criteria/{criteria_id}/sign-off
```

**Note:** The `link` field is required for specific criteria types:
- Smoke & Extended Smoke Regression
- Full Regression
- CPT Sign-off

### User Permissions

```bash
# Grant product owner permission (admin only)
POST /api/users/{user_id}/grant-product-owner

# Revoke product owner permission (admin only)
DELETE /api/users/{user_id}/revoke-product-owner

# Check product owner status
GET /api/users/{user_id}/is-product-owner
```

### Audit Logs

```bash
# Get release activity history
GET /api/releases/{release_id}/history

# Query all audit logs
GET /api/audit?entity_type=release&action=update&limit=50
```

## Authentication

The application uses a simplified header-based authentication for development:

```bash
# Include user ID in requests
X-User-Id: 1
```

The frontend stores the current user ID in localStorage and includes it in all API requests.

## Documentation

- [Quick Start Guide](./QUICK_START_GUIDE.md) - Get up and running quickly
- [User Guide](./USER_GUIDE.md) - Comprehensive usage documentation
- [Deployment Playbook](./DEPLOYMENT_PLAYBOOK.md) - Production deployment guide for GCP and private cloud
- [API Documentation](./BACKEND_API_DOCUMENTATION.md) - Backend API reference

## Development

### Running Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### Building for Production

```bash
# Frontend build
cd frontend
npm run build
```

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
