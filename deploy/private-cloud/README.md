# Private Cloud / On-Premise Deployment

Deploy Release Tracker to Ubuntu VMs on any infrastructure: on-premise servers, private cloud, or any VM provider.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Ubuntu 22.04 VM                            │
│                                                         │
│  Git ───────────────────┐                               │
│  (GitHub/GitLab/etc)    │                               │
│                         ▼                               │
│  /opt/release-tracker/app/ ◄── git clone/pull           │
│                                                         │
│  Services:                                              │
│  ┌─────────────┐     ┌──────────────────┐              │
│  │   nginx     │────►│  release-tracker │              │
│  │   (port 80) │     │  (port 8000)     │              │
│  └─────────────┘     └──────────────────┘              │
│        │                     │                          │
│        ▼                     ▼                          │
│  frontend/dist/        SQLite DB                        │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Ubuntu 22.04 LTS** or later
- **Root/sudo access** to the VM
- **Network access** to the git repository (GitHub, GitLab, etc.)
- **Google OAuth credentials** (client ID and secret)

## Directory Structure on VM

```
/opt/release-tracker/
├── app/                      # Git clone of repository
│   ├── backend/
│   │   ├── .venv/            # Python virtual environment
│   │   ├── .env              # Backend environment config
│   │   └── release_tracker.db
│   ├── frontend/
│   │   ├── dist/             # Built frontend assets
│   │   └── .env              # Frontend environment config
│   └── deploy/               # Deployment scripts (from repo)
├── backups/                  # Pre-migration database backups
└── config/                   # Persistent configuration
    └── .env                  # Master environment file
```

## Initial Setup

### 1. Connect to Your VM

```bash
ssh user@your-vm-ip
```

### 2. Download and Configure

```bash
# Download the provisioning script and environment template
curl -O https://raw.githubusercontent.com/<your-org>/release-tracker/main/deploy/private-cloud/provision.sh
curl -O https://raw.githubusercontent.com/<your-org>/release-tracker/main/deploy/private-cloud/env.example

# Create your configuration
cp env.example .env
nano .env  # Or use your preferred editor
```

### 3. Configure Environment Variables

Edit `.env` and fill in the required values:

| Variable | Required | Description |
|----------|----------|-------------|
| `REPO_URL` | Yes | Git repository URL (HTTPS or SSH) |
| `REPO_BRANCH` | No | Branch to deploy (default: `main`) |
| `SECRET_KEY` | Yes | JWT secret - generate with `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth Client Secret |
| `VITE_GOOGLE_CLIENT_ID` | Yes | Same as `GOOGLE_CLIENT_ID` |
| `DATABASE_URL` | No | Database connection (default: SQLite) |
| `SERVER_NAME` | No | Nginx server name (default: `_` for all hosts) |

### 4. Run Provisioning

```bash
chmod +x provision.sh
sudo ./provision.sh
```

This will:
1. Install system packages (Python 3.11, Node.js 20, nginx)
2. Create the `releasetracker` system user
3. Clone the repository
4. Set up Python virtual environment
5. Configure systemd and nginx
6. Run the initial deployment

### 5. Configure OAuth Redirect URIs

In the Google Cloud Console, add these authorized redirect URIs:
- `http://<your-vm-ip>/api/auth/callback`
- `http://<your-domain>/api/auth/callback` (if using a domain)

### 6. Access the Application

Open `http://<your-vm-ip>/` in your browser.

## Deploying Updates

### Deploy Latest from Main Branch

```bash
cd /opt/release-tracker/app
sudo ./deploy/private-cloud/deploy.sh
```

### Deploy Specific Branch

```bash
sudo ./deploy/private-cloud/deploy.sh --branch feature-xyz
```

### Deploy Specific Tag/Release

```bash
sudo ./deploy/private-cloud/deploy.sh --tag v1.2.0
```

### Backend-Only Update

Faster deployment when frontend hasn't changed:

```bash
sudo ./deploy/private-cloud/deploy.sh --backend-only
```

### Frontend-Only Update

```bash
sudo ./deploy/private-cloud/deploy.sh --frontend-only
```

### Skip Migrations

Use with caution - only when you know no migrations are needed:

```bash
sudo ./deploy/private-cloud/deploy.sh --skip-migrations
```

## Rollback Procedures

### Rollback to Previous Commit

```bash
cd /opt/release-tracker/app

# View recent commits
sudo git log --oneline -10

# Rollback to specific commit
sudo git checkout <commit-hash>
sudo ./deploy/private-cloud/deploy.sh --skip-migrations
```

### Rollback to Previous Tag

```bash
sudo ./deploy/private-cloud/deploy.sh --tag v1.1.0
```

### Restore Database from Backup

If a migration caused issues:

```bash
# Stop the service
sudo systemctl stop release-tracker

# List available backups
ls -la /opt/release-tracker/backups/

# Restore from backup
sudo cp /opt/release-tracker/backups/release_tracker_pre_migration_YYYYMMDD_HHMMSS.db \
        /opt/release-tracker/app/backend/release_tracker.db
sudo chown releasetracker:releasetracker /opt/release-tracker/app/backend/release_tracker.db

# Start the service
sudo systemctl start release-tracker
```

## Operations

### Service Management

```bash
# Check service status
sudo systemctl status release-tracker
sudo systemctl status nginx

# Restart services
sudo systemctl restart release-tracker
sudo systemctl restart nginx

# Stop/start services
sudo systemctl stop release-tracker
sudo systemctl start release-tracker
```

### Viewing Logs

```bash
# Backend logs (via journald)
sudo journalctl -u release-tracker -f           # Follow live
sudo journalctl -u release-tracker -n 100       # Last 100 lines
sudo journalctl -u release-tracker --since today

# Nginx logs
sudo tail -f /var/log/nginx/release-tracker-access.log
sudo tail -f /var/log/nginx/release-tracker-error.log
```

### Health Checks

```bash
# Backend direct
curl http://localhost:8000/health

# Frontend via nginx
curl http://localhost/

# API via nginx
curl http://localhost/health
```

### Database Operations

```bash
cd /opt/release-tracker/app/backend

# Check migration status
sudo -u releasetracker .venv/bin/alembic current
sudo -u releasetracker .venv/bin/alembic history

# Manual migration (if needed)
sudo -u releasetracker .venv/bin/alembic upgrade head
```

## Troubleshooting

### Service Won't Start

```bash
# Check service logs
sudo journalctl -u release-tracker -n 50

# Check service status
sudo systemctl status release-tracker

# Common issues:
# - Missing .env file
# - Database permissions
# - Port already in use
```

### 502 Bad Gateway

The backend isn't responding to nginx:

```bash
# Check if backend is running
sudo systemctl status release-tracker

# Check if backend is listening
curl http://localhost:8000/health

# Check nginx error log
sudo tail -20 /var/log/nginx/release-tracker-error.log
```

### Database Locked

SQLite concurrency issue:

```bash
# Stop service
sudo systemctl stop release-tracker

# Check for stale locks
lsof +D /opt/release-tracker/app/backend/

# Restart service
sudo systemctl start release-tracker
```

### Permission Denied Errors

```bash
# Reset ownership
sudo chown -R releasetracker:releasetracker /opt/release-tracker/app
sudo chown -R releasetracker:releasetracker /opt/release-tracker/backups

# Check .env file permissions
sudo chmod 600 /opt/release-tracker/config/.env
```

### Frontend Build Fails

```bash
cd /opt/release-tracker/app/frontend

# Clear npm cache
sudo rm -rf node_modules package-lock.json
sudo npm install

# Check for TypeScript errors
sudo npx tsc --noEmit
```

### OAuth Not Working

1. Verify redirect URIs in Google Cloud Console match your server
2. Check that `GOOGLE_CLIENT_ID` is set in both backend and frontend .env
3. Ensure `VITE_GOOGLE_CLIENT_ID` matches `GOOGLE_CLIENT_ID`

## Security Considerations

### Firewall

Configure your firewall to only allow necessary ports:

```bash
# UFW example
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS (if using SSL)
sudo ufw enable
```

### SSL/HTTPS

For production, configure SSL with Let's Encrypt:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (requires a domain name)
sudo certbot --nginx -d your-domain.com
```

### Environment Security

- The `.env` file in `/opt/release-tracker/config/` is readable only by root
- Never commit `.env` files to git
- Rotate `SECRET_KEY` periodically
- Use strong OAuth credentials

## PostgreSQL (Optional)

For production workloads, consider using PostgreSQL instead of SQLite:

1. Install PostgreSQL:
```bash
sudo apt install postgresql postgresql-contrib
```

2. Create database and user:
```bash
sudo -u postgres psql
CREATE USER releasetracker WITH PASSWORD 'your-password';
CREATE DATABASE releasetracker OWNER releasetracker;
\q
```

3. Update `.env`:
```
DATABASE_URL=postgresql+asyncpg://releasetracker:your-password@localhost:5432/releasetracker
```

4. Install PostgreSQL driver:
```bash
cd /opt/release-tracker/app/backend
sudo -u releasetracker .venv/bin/pip install asyncpg
```

5. Redeploy:
```bash
sudo ./deploy/private-cloud/deploy.sh
```
