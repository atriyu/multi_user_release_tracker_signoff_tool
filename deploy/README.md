# Deployment Scripts

This directory contains deployment scripts and configuration for the Release Tracker application.

## Directory Structure

```
deploy/
├── scripts/
│   ├── common.sh           # Shared variables and functions
│   ├── deploy.sh           # Main deployment orchestrator
│   ├── deploy-backend.sh   # Backend-only deployment
│   ├── deploy-frontend.sh  # Frontend-only deployment
│   ├── run-migrations.sh   # Database migrations
│   └── health-check.sh     # Post-deployment health checks
├── config/
│   ├── nginx.conf          # Nginx configuration template
│   └── release-tracker.service  # Systemd service file
└── README.md
```

## Prerequisites

1. **gcloud CLI** installed and authenticated
2. **SSH access** to the GCP VM
3. **Environment variables** configured (see below)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GCP_ZONE` | No | GCP zone (default: `us-central1-a`) |
| `VM_NAME` | No | VM instance name (default: `release-tracker-vm`) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth Client Secret |
| `SECRET_KEY` | Yes | JWT signing secret |
| `VITE_GOOGLE_CLIENT_ID` | Yes | Same as GOOGLE_CLIENT_ID (for frontend) |
| `DOMAIN` | No | Domain name for external health checks |

## Usage

### Full Deployment

```bash
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export SECRET_KEY="your-jwt-secret-key"
export VITE_GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"

./deploy/scripts/deploy.sh
```

### Backend Only

```bash
./deploy/scripts/deploy.sh --backend-only
```

### Frontend Only

```bash
./deploy/scripts/deploy.sh --frontend-only
```

### Skip Health Checks

```bash
./deploy/scripts/deploy.sh --skip-health-check
```

### Run Migrations Only

```bash
./deploy/scripts/run-migrations.sh
```

### Health Check Only

```bash
./deploy/scripts/health-check.sh
./deploy/scripts/health-check.sh --external  # Include external URL check
```

## GitHub Actions

The `.github/workflows/deploy.yml` workflow automatically deploys on push to `main`.

### Required Secrets

Configure these secrets in your GitHub repository (Settings > Secrets > Actions):

| Secret | Description |
|--------|-------------|
| `GCP_PROJECT_ID` | Google Cloud project ID |
| `GCP_SA_KEY` | Service account JSON key with Compute Admin role |
| `GOOGLE_CLIENT_ID` | OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret |
| `SECRET_KEY` | JWT signing secret (generate with `openssl rand -hex 32`) |

### Manual Deployment

You can also trigger deployment manually:

1. Go to Actions tab in GitHub
2. Select "Deploy to GCP" workflow
3. Click "Run workflow"
4. Choose deployment target (all, backend-only, frontend-only)

## Deployment Order

The deployment follows this order to ensure zero-downtime:

1. **Pull code** - Fetch latest from main branch
2. **Install dependencies** - Backend Python packages, frontend npm packages
3. **Run migrations** - Apply database schema changes (with backup)
4. **Restart backend** - After migrations complete
5. **Build frontend** - Compile with environment variables
6. **Health checks** - Verify everything is working

## Rollback

### Quick Rollback

If a deployment fails, you can rollback to a previous commit:

```bash
# On the VM
cd /opt/release-tracker/app
sudo git log --oneline -5  # Find previous good commit
sudo git reset --hard <commit-hash>
sudo systemctl restart release-tracker
```

### Database Rollback

Pre-migration backups are stored in `/opt/release-tracker/backups/`:

```bash
# List backups
ls -la /opt/release-tracker/backups/

# Restore a backup
sudo systemctl stop release-tracker
sudo -u releasetracker cp /opt/release-tracker/backups/<backup-file> \
    /opt/release-tracker/app/backend/release_tracker.db
sudo systemctl start release-tracker
```

## Troubleshooting

### SSH Connection Failed

```bash
# Re-authenticate gcloud
gcloud auth login

# Test SSH
gcloud compute ssh release-tracker-vm --zone=us-central1-a --command="echo test"
```

### Service Won't Start

```bash
# Check logs
gcloud compute ssh release-tracker-vm --zone=us-central1-a \
    --command="sudo journalctl -u release-tracker -n 50"
```

### Migration Failed

1. Check the error in the logs
2. Restore from backup if needed
3. Fix the migration issue
4. Re-run deployment

### Frontend Build Failed

```bash
# Check for TypeScript/build errors
gcloud compute ssh release-tracker-vm --zone=us-central1-a \
    --command="cd /opt/release-tracker/app/frontend && sudo npx tsc --noEmit"
```
