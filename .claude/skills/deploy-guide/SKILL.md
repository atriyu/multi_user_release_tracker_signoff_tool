---
name: deploy-guide
description: Deployment checklist, operational guidelines, and troubleshooting for Release Tracker. Reference this when deploying, debugging production issues, or modifying deployment scripts.
disable-model-invocation: true
---

# Release Tracker - Deployment Guide & Operations

## Deployment Environments

| Environment | Database | Auth | URL Pattern |
|-------------|----------|------|-------------|
| **Local dev** | SQLite (`release_tracker.db`) | Google OAuth (localhost:5173) | `http://localhost:5173` |
| **GCP VM** | SQLite (can use PostgreSQL) | Google OAuth (nip.io domain) | `http://<IP>.nip.io` |
| **Private Cloud** | SQLite or PostgreSQL | Google OAuth | Custom domain or nip.io |

## Deployment Methods

### 1. GitHub Actions (GCP)
- **Trigger**: Push to `main` or manual dispatch via Actions UI
- **Workflow**: `.github/workflows/deploy.yml`
- **Secrets needed**: `GCP_SA_KEY`, `GCP_PROJECT_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SECRET_KEY`
- **What it does**: SSH into GCP VM, git pull, install deps, run migrations, build frontend, restart service, health check

### 2. Private Cloud Script
- **Script**: `deploy/private-cloud/deploy.sh`
- **Run as**: `sudo ./deploy.sh [options]`
- **Options**: `--branch <name>`, `--tag <version>`, `--backend-only`, `--frontend-only`, `--skip-migrations`

### 3. Manual Deployment
SSH into VM and run commands directly. See step-by-step below.

---

## Pre-Deployment Checklist

Before deploying any change, verify:

- [ ] All tests pass locally: `cd backend && pytest`
- [ ] Frontend builds cleanly: `cd frontend && npm run build`
- [ ] New migrations tested locally: `.venv/bin/alembic upgrade head`
- [ ] Environment variables documented if new ones added
- [ ] No secrets committed to git (check `.env` files are in `.gitignore`)

## Deployment Order (Critical)

The deployment sequence MUST follow this order:

```
1. Pull latest code (git fetch + checkout/pull)
2. Install backend dependencies (pip install -r requirements.txt)
3. Backup database (BEFORE migration)
4. Run database migrations (alembic upgrade head)
5. Restart backend service (systemctl restart release-tracker)
6. Install frontend dependencies (npm ci or npm install)
7. Build frontend (npm run build)
8. Health checks
```

**Why this order matters:**
- Dependencies must be installed BEFORE migrations (new migration may need new packages)
- Database backup BEFORE migration (in case migration fails)
- Migrations BEFORE service restart (new code may expect new schema)
- Backend restart BEFORE frontend build (frontend build is slow, backend should be up ASAP)

---

## Database Migration Safety

### Before running migrations:
1. **Always backup first**:
   ```bash
   cp backend/release_tracker.db /opt/release-tracker/backups/release_tracker_pre_migration_$(date +%Y%m%d_%H%M%S).db
   ```
2. **Check current revision**:
   ```bash
   cd backend && .venv/bin/alembic current
   ```
3. **Preview what will run**:
   ```bash
   .venv/bin/alembic upgrade head --sql  # Shows SQL without executing
   ```

### After running migrations:
1. Verify new revision: `.venv/bin/alembic current`
2. Verify app starts without errors
3. Check health endpoint returns 200

### Rollback procedure:
```bash
# 1. Stop service
sudo systemctl stop release-tracker

# 2. Restore database backup
cp /opt/release-tracker/backups/release_tracker_pre_migration_YYYYMMDD_HHMMSS.db backend/release_tracker.db

# 3. Downgrade to previous revision
cd backend && .venv/bin/alembic downgrade -1

# 4. Checkout previous code
git checkout <previous-commit>

# 5. Restart service
sudo systemctl restart release-tracker
```

---

## VM Directory Structure

```
/opt/release-tracker/
├── app/                         # Git repository clone
│   ├── backend/
│   │   ├── .venv/              # Python virtual environment
│   │   ├── .env                # Backend secrets (600 perms)
│   │   └── release_tracker.db  # SQLite database
│   ├── frontend/
│   │   ├── dist/               # Built frontend assets
│   │   └── .env                # VITE_GOOGLE_CLIENT_ID
│   └── deploy/
├── backups/                     # Pre-migration database backups
└── config/
    └── .env                     # Master environment config
```

- **File ownership**: `releasetracker:releasetracker` for all app files
- **Backend .env permissions**: `chmod 600` (only owner can read)
- **Service user**: `releasetracker` (no login shell, system user)

---

## Service Management

### Systemd service: `release-tracker`
```bash
sudo systemctl start release-tracker     # Start
sudo systemctl stop release-tracker      # Stop
sudo systemctl restart release-tracker   # Restart
sudo systemctl status release-tracker    # Check status
sudo journalctl -u release-tracker -f    # Follow logs
sudo journalctl -u release-tracker -n 50 # Last 50 log lines
```

### Nginx
```bash
sudo systemctl reload nginx              # Reload config (no downtime)
sudo nginx -t                            # Test config before reload
sudo systemctl restart nginx             # Full restart
```

---

## Health Checks

After any deployment, verify:

```bash
# 1. Service is running
sudo systemctl is-active release-tracker

# 2. Backend responds
curl -sf http://localhost:8000/health

# 3. Frontend serves
curl -sf -o /dev/null http://localhost/

# 4. API accessible through nginx
curl -sf http://localhost/api/docs
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
sudo journalctl -u release-tracker --no-pager -n 50

# Common causes:
# - Missing .env file or variables
# - Migration not applied (schema mismatch)
# - Port 8000 already in use
# - Python dependency missing
```

### Frontend shows blank page
```bash
# Check if dist/ exists and has files
ls -la /opt/release-tracker/app/frontend/dist/

# Rebuild if needed
cd /opt/release-tracker/app/frontend
npm run build
```

### OAuth errors (Access Blocked / redirect_uri_mismatch)
1. Check Google Cloud Console > APIs & Services > Credentials
2. Verify authorized JavaScript origins include your URL (with nip.io if using IP)
3. Verify authorized redirect URIs include your URL
4. Remember: changes take a few minutes to propagate

### Database locked (SQLite)
```bash
# Check for lingering processes
sudo fuser backend/release_tracker.db

# Restart service to release lock
sudo systemctl restart release-tracker
```

### SSH connection fails (GitHub Actions)
1. Verify service account has `Compute Instance Admin (v1)` and `Service Account User` roles
2. Verify OS Login is enabled on VM metadata
3. Check `GCP_SA_KEY` secret is valid JSON
4. Try: `gcloud compute ssh <vm-name> --zone=<zone>` manually

---

## Environment Variables Reference

### Backend (.env)
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | `sqlite+aiosqlite:///./release_tracker.db` or `postgresql+asyncpg://...` |
| `GOOGLE_CLIENT_ID` | Yes | From Google Cloud Console OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | Yes | From Google Cloud Console OAuth credentials |
| `SECRET_KEY` | Yes | Random 32+ byte string for JWT signing |
| `DEBUG` | No | `true` for development, `false` for production |

### Frontend (.env)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Yes | Same as backend GOOGLE_CLIENT_ID |

### GitHub Actions Secrets
| Secret | Description |
|--------|-------------|
| `GCP_SA_KEY` | Service account JSON key (full file contents) |
| `GCP_PROJECT_ID` | GCP project ID |
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `SECRET_KEY` | JWT signing secret |

---

## Nginx Configuration

Config location: `/etc/nginx/sites-available/release-tracker`

Key routing rules:
- `/api/*` proxied to `http://localhost:8000` (FastAPI backend)
- `/health` proxied to `http://localhost:8000/health`
- Everything else served from `frontend/dist/` (React SPA)
- SPA fallback: `try_files $uri $uri/ /index.html` for client-side routing

**When IP changes** (e.g., after VM restart without static IP):
1. Update `server_name` in nginx config with new IP and nip.io domain
2. Update Google OAuth Console with new authorized origins/redirects
3. `sudo nginx -t && sudo systemctl reload nginx`

---

## Modifying Deployment Scripts

When editing deployment scripts, follow these rules:
1. **Always use `set -e`** at the top (fail on any error)
2. **Log before and after** every significant operation
3. **Backup before destructive operations** (database changes, file overwrites)
4. **Health check at the end** to verify deployment succeeded
5. **Run as root** (scripts use `sudo -u releasetracker` for app operations)
6. **Test scripts locally first** with `--skip-health-check` if needed
