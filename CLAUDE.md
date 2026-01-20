# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Release Tracker is a full-stack release management application with multi-user approval workflows. Users can create releases with criteria, assign stakeholders, and collect sign-offs through a visual matrix interface.

## Development Commands

### Backend (FastAPI + Python)
```bash
cd backend
source .venv/bin/activate              # Activate virtualenv
pip install -r requirements.txt        # Install dependencies
.venv/bin/alembic upgrade head         # Run migrations
.venv/bin/uvicorn app.main:app --reload --port 8000  # Start dev server
pytest                                  # Run tests
pytest tests/test_file.py::test_name   # Run single test
```

### Frontend (React + TypeScript + Vite)
```bash
cd frontend
npm install         # Install dependencies
npm run dev         # Start dev server (port 5173, proxies /api to :8000)
npm run build       # TypeScript check + production build
npm run lint        # ESLint
```

### Database
- SQLite for development, PostgreSQL for production
- Migrations in `backend/alembic/versions/`
- Create migration: `alembic revision --autogenerate -m "description"`

## Architecture

### Backend Structure (`backend/app/`)
- **api/**: FastAPI routers organized by domain (auth, products, releases, signoffs, etc.)
- **models/**: SQLAlchemy ORM models with async support
- **schemas/**: Pydantic request/response models
- **dependencies/auth.py**: Authentication helpers (`get_current_user`, `RequireAdmin`, `RequireAdminOrProductOwner`)
- **services/**: Business logic layer

### Frontend Structure (`frontend/src/`)
- **api/**: Axios-based API client functions, one file per domain
- **hooks/**: React Query hooks wrapping API calls (useReleases, useProducts, etc.)
- **pages/**: Route components
- **components/**: Reusable UI components
- **context/AuthContext.tsx**: Global auth state + admin impersonation
- **types/index.ts**: All TypeScript type definitions

### Key Patterns

**Backend Auth:**
- JWT tokens via `Authorization: Bearer <token>` header
- Admin impersonation via `X-User-Id` header (requires admin JWT)
- Role dependencies: `RequireAdmin`, `RequireAdminOrProductOwner`, `RequireAnyRole`

**Frontend Data Fetching:**
- TanStack React Query for server state
- Mutations invalidate related queries on success
- Query keys follow pattern: `['entity', id]` or `['entities', params]`

**API Client (`frontend/src/api/client.ts`):**
- Axios instance with `/api` base URL
- Request interceptor adds JWT token and impersonation header
- Response interceptor redirects to `/login` on 401

## Domain Model

- **Product**: Container for releases with permission model
- **Release**: Has version, status (draft/in_review/approved/released), criteria, and stakeholders
- **Criteria**: Sign-off items (mandatory/optional) within a release
- **SignOff**: A stakeholder's approval/rejection of a criteria
- **Template**: Reusable criteria sets for creating releases

**Sign-off Logic:**
- ANY rejection → Criteria rejected
- ALL approved → Criteria approved
- Otherwise → Pending

## Environment Variables

Backend (`backend/.env`):
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SECRET_KEY=...
DATABASE_URL=sqlite+aiosqlite:///./release_tracker.db
```

Frontend (`frontend/.env`):
```
VITE_GOOGLE_CLIENT_ID=...
```
