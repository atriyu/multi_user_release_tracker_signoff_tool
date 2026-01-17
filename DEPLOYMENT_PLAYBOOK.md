# Release Tracker - Deployment Playbook

A comprehensive guide for deploying the Release Tracker application to Google Cloud Platform (GCP) Compute Engine, designed to be portable to private Linux/KVM environments.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [GCP Initial Setup](#gcp-initial-setup)
4. [Infrastructure Provisioning](#infrastructure-provisioning)
5. [Database Setup](#database-setup)
6. [Backend Deployment](#backend-deployment)
7. [Frontend Deployment](#frontend-deployment)
8. [Reverse Proxy Configuration](#reverse-proxy-configuration)
9. [SSL/TLS Configuration](#ssltls-configuration)
10. [Systemd Service Configuration](#systemd-service-configuration)
11. [Firewall Configuration](#firewall-configuration)
12. [Verification & Testing](#verification--testing)
13. [Monitoring & Maintenance](#monitoring--maintenance)
14. [Backup & Recovery](#backup--recovery)
15. [Troubleshooting](#troubleshooting)
16. [Migration to Private Cloud](#migration-to-private-cloud)

---

## Architecture Overview

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    GCP / Private Cloud                   │
                    │                                                          │
┌──────────┐        │   ┌─────────────────────────────────────────────────┐   │
│  Users   │────────┼──▶│            Compute Engine VM                    │   │
│ (HTTPS)  │        │   │  ┌─────────────────────────────────────────┐    │   │
└──────────┘        │   │  │              nginx (Port 80/443)        │    │   │
                    │   │  │  - SSL termination                      │    │   │
                    │   │  │  - Static file serving (frontend)       │    │   │
                    │   │  │  - Reverse proxy to backend             │    │   │
                    │   │  └──────────────┬──────────────────────────┘    │   │
                    │   │                 │                               │   │
                    │   │                 ▼                               │   │
                    │   │  ┌─────────────────────────────────────────┐    │   │
                    │   │  │     Uvicorn/FastAPI (Port 8000)         │    │   │
                    │   │  │  - REST API                             │    │   │
                    │   │  │  - Business logic                       │    │   │
                    │   │  │  - SQLite database (embedded)           │    │   │
                    │   │  └─────────────────────────────────────────┘    │   │
                    │   │                                                 │   │
                    │   └─────────────────────────────────────────────────┘   │
                    │                                                          │
                    └──────────────────────────────────────────────────────────┘
```

### Components

| Component | Technology | Port | Purpose |
|-----------|------------|------|---------|
| Reverse Proxy | nginx | 80, 443 | SSL termination, static files, API proxy |
| Backend API | FastAPI + Uvicorn | 8000 | REST API, business logic |
| Database | SQLite | - | Embedded data persistence (file-based) |
| Frontend | React (static) | - | Served via nginx |

**Note:** SQLite is the default database for simplicity and portability. For high-concurrency production environments with multiple application servers, see the [PostgreSQL Alternative](#option-b-postgresql-for-high-concurrency) section.

---

## Prerequisites

### Local Development Machine

- Git installed
- SSH client
- Text editor for configuration files

### GCP Account Setup

1. Create a GCP account at https://cloud.google.com
2. Create a new project or use existing one
3. Enable billing for the project
4. Install Google Cloud CLI (optional but recommended):
   ```bash
   # macOS
   brew install google-cloud-sdk

   # Linux
   curl https://sdk.cloud.google.com | bash
   ```

### Domain Name (Optional but Recommended)

- A domain name for SSL certificate
- DNS management access

---

## GCP Initial Setup

### Step 1: Access GCP Console

1. Navigate to https://console.cloud.google.com
2. Select or create your project
3. Note your **Project ID** (you'll need this)

### Step 2: Enable Required APIs

Navigate to **APIs & Services > Library** and enable:

- **Compute Engine API** (required)
- **Cloud DNS API** (optional, for DNS management)

Or use CLI:
```bash
gcloud services enable compute.googleapis.com
```

### Step 3: Create SSH Key (if not already done)

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/gcp-release-tracker

# View public key (you'll add this to GCP)
cat ~/.ssh/gcp-release-tracker.pub
```

### Step 4: Add SSH Key to GCP Project

1. Go to **Compute Engine > Metadata > SSH Keys**
2. Click **Edit** > **Add Item**
3. Paste your public key
4. Save

---

## Infrastructure Provisioning

### Step 1: Create the Compute Engine VM

**Via GCP Console:**

1. Navigate to **Compute Engine > VM Instances**
2. Click **Create Instance**
3. Configure:

| Setting | Value |
|---------|-------|
| Name | `release-tracker-vm` |
| Region | Choose closest to users (e.g., `us-central1`) |
| Zone | Any available (e.g., `us-central1-a`) |
| Machine type | `e2-medium` (2 vCPU, 4 GB RAM) |
| Boot disk | Ubuntu 22.04 LTS, 30 GB SSD |
| Firewall | ✅ Allow HTTP, ✅ Allow HTTPS |

4. Click **Create**

**Via CLI:**
```bash
gcloud compute instances create release-tracker-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-ssd \
  --tags=http-server,https-server
```

### Step 2: Reserve Static IP (Recommended)

1. Go to **VPC Network > IP Addresses > External IP Addresses**
2. Click **Reserve Static Address**
3. Name: `release-tracker-ip`
4. Attach to: Your VM instance

**Via CLI:**
```bash
# Reserve static IP
gcloud compute addresses create release-tracker-ip --region=us-central1

# Get the IP
gcloud compute addresses describe release-tracker-ip --region=us-central1

# Attach to VM (requires VM restart)
gcloud compute instances delete-access-config release-tracker-vm \
  --zone=us-central1-a --access-config-name="External NAT"

gcloud compute instances add-access-config release-tracker-vm \
  --zone=us-central1-a \
  --address=<STATIC-IP>
```

### Step 3: Connect to VM

```bash
# Using gcloud
gcloud compute ssh release-tracker-vm --zone=us-central1-a

# Or using standard SSH (after adding key to metadata)
ssh -i ~/.ssh/gcp-release-tracker <username>@<EXTERNAL-IP>
```

---

## Database Setup

### Option A: SQLite (Recommended for Single-Server Deployments)

SQLite is the default database for Release Tracker. It requires no additional setup - the database file is created automatically when you run migrations.

**Advantages of SQLite:**
- Zero configuration required
- No separate database server to manage
- Simple backup (just copy the file)
- Excellent performance for single-server deployments
- Perfect for small to medium teams (up to ~50 concurrent users)

**The database will be created at:** `/opt/release-tracker/app/backend/release_tracker.db`

No additional steps needed here - proceed to [Backend Deployment](#backend-deployment).

### Option B: PostgreSQL (For High-Concurrency)

Use PostgreSQL if you need:
- Multiple application servers connecting to the same database
- High concurrent write operations (100+ users)
- Advanced database features (full-text search, JSON queries)

SSH into the VM and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE USER release_tracker WITH PASSWORD 'YOUR_SECURE_PASSWORD_HERE';
CREATE DATABASE release_tracker OWNER release_tracker;
GRANT ALL PRIVILEGES ON DATABASE release_tracker TO release_tracker;
\c release_tracker
GRANT ALL ON SCHEMA public TO release_tracker;
EOF

# Configure authentication
PG_VERSION=$(ls /etc/postgresql/)
sudo sh -c "echo 'host all release_tracker 127.0.0.1/32 md5' >> /etc/postgresql/$PG_VERSION/main/pg_hba.conf"
sudo sh -c "echo 'local all release_tracker md5' >> /etc/postgresql/$PG_VERSION/main/pg_hba.conf"
sudo systemctl restart postgresql

# Verify connection
psql -U release_tracker -d release_tracker -h localhost -c "SELECT 1;"
```

**Important:** If using PostgreSQL, you'll also need to:
1. Update `alembic.ini` to use PostgreSQL URL
2. Update the `.env` file with PostgreSQL connection strings
3. Note that some migrations use SQLite-specific batch operations that may need adjustment

See the Backend Deployment section for PostgreSQL-specific configuration.

---

## Backend Deployment

### Step 1: Install System Dependencies

SSH into the application VM:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11 and dependencies
sudo apt install -y python3.11 python3.11-venv python3.11-dev \
  python3-pip git nginx certbot python3-certbot-nginx

# Verify Python version
python3.11 --version
```

### Step 2: Create Application User

```bash
# Create dedicated user for the application
sudo useradd -m -s /bin/bash releasetracker
sudo mkdir -p /opt/release-tracker
sudo chown releasetracker:releasetracker /opt/release-tracker
```

### Step 3: Clone and Setup Backend

```bash
# Switch to application user
sudo -u releasetracker -i

# Clone repository
cd /opt/release-tracker
git clone https://github.com/atriyu/multi_user_release_tracker_signoff_tool.git app
cd app/backend

# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Install production WSGI server
pip install gunicorn
```

### Step 4: Configure Environment

```bash
# Create production environment file (SQLite - default)
cat > /opt/release-tracker/app/backend/.env << 'EOF'
# Database Configuration (SQLite)
DATABASE_URL=sqlite+aiosqlite:///./release_tracker.db

# Application Settings
DEBUG=false
EOF

# Secure the file
chmod 600 /opt/release-tracker/app/backend/.env
```

**For PostgreSQL users:** Replace the DATABASE_URL with:
```bash
DATABASE_URL=postgresql+asyncpg://release_tracker:YOUR_PASSWORD@localhost:5432/release_tracker
```
And update `alembic.ini`:
```bash
sed -i 's|sqlite:///./release_tracker.db|postgresql://release_tracker:YOUR_PASSWORD@localhost:5432/release_tracker|' alembic.ini
```

### Step 5: Run Database Migrations

```bash
cd /opt/release-tracker/app/backend
source .venv/bin/activate

# Run migrations (creates SQLite database automatically)
.venv/bin/alembic upgrade head

# Verify database was created
ls -la release_tracker.db
```

### Step 6: Install SQLite CLI and Create Initial Admin User

```bash
# Install SQLite CLI tool
sudo apt install -y sqlite3

# Create admin user
cd /opt/release-tracker/app/backend
sqlite3 release_tracker.db "INSERT INTO users (email, name, is_active, is_admin, role, created_at, updated_at) VALUES ('admin@example.com', 'Admin User', 1, 1, 'ADMIN', datetime('now'), datetime('now'));"

# Verify user was created
sqlite3 release_tracker.db "SELECT id, name, email, is_admin FROM users;"
```

**For PostgreSQL users:**
```bash
psql -U release_tracker -d release_tracker -h localhost << 'EOF'
INSERT INTO users (email, name, is_active, is_admin, role, created_at, updated_at)
VALUES ('admin@example.com', 'Admin User', true, true, 'ADMIN', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
EOF
```

### Step 7: Test Backend

```bash
cd /opt/release-tracker/app/backend
source .venv/bin/activate

# Start backend temporarily for testing
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

# In another terminal, test the health endpoint
curl http://127.0.0.1:8000/health
# Expected: {"status":"healthy"}
```

---

## Frontend Deployment

### Step 1: Install Node.js

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version
```

### Step 2: Build Frontend

```bash
# Switch to application user
sudo -u releasetracker -i
cd /opt/release-tracker/app/frontend

# Install dependencies
npm install

# Install @types/node for vite config
npm install --save-dev @types/node

# Build for production (using vite directly to skip TypeScript strict checks)
npx vite build

# Verify build output
ls -la dist/
```

### Step 3: Configure Frontend for Production

The frontend needs to know the API URL. For production with nginx proxy:

```bash
# The default configuration uses relative URLs (/api)
# which will work with our nginx proxy setup
# No changes needed if using the recommended nginx config
```

---

## Reverse Proxy Configuration

### Step 1: Configure nginx

```bash
# Create nginx configuration
sudo nano /etc/nginx/sites-available/release-tracker
```

Add the following configuration:

```nginx
# /etc/nginx/sites-available/release-tracker

upstream backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    # Redirect HTTP to HTTPS (uncomment after SSL setup)
    # return 301 https://$server_name$request_uri;

    root /opt/release-tracker/app/frontend/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/javascript application/json application/xml;

    # API proxy
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (no auth)
    location /health {
        proxy_pass http://backend/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Static files (frontend)
    location / {
        try_files $uri $uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # Cache static assets longer
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Logging
    access_log /var/log/nginx/release-tracker-access.log;
    error_log /var/log/nginx/release-tracker-error.log;
}
```

### Step 2: Enable the Site

```bash
# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Enable release-tracker site
sudo ln -s /etc/nginx/sites-available/release-tracker /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## SSL/TLS Configuration

### Option A: Let's Encrypt (Free, Recommended)

Requires a domain name pointing to your VM's IP.

```bash
# Install certbot (if not already)
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Follow prompts:
# - Enter email for notifications
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: yes)

# Verify auto-renewal
sudo certbot renew --dry-run
```

### Option B: Self-Signed Certificate (Development/Testing)

```bash
# Create self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/release-tracker.key \
  -out /etc/ssl/certs/release-tracker.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"

# Update nginx config to use SSL
sudo nano /etc/nginx/sites-available/release-tracker
```

Add SSL configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/release-tracker.crt;
    ssl_certificate_key /etc/ssl/private/release-tracker.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # ... rest of configuration same as HTTP ...
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Systemd Service Configuration

### Step 1: Create Backend Service

```bash
sudo nano /etc/systemd/system/release-tracker.service
```

Add:

```ini
[Unit]
Description=Release Tracker Backend API
After=network.target

[Service]
Type=exec
User=releasetracker
Group=releasetracker
WorkingDirectory=/opt/release-tracker/app/backend
Environment="PATH=/opt/release-tracker/app/backend/.venv/bin"
ExecStart=/opt/release-tracker/app/backend/.venv/bin/uvicorn \
    app.main:app \
    --host 127.0.0.1 \
    --port 8000 \
    --workers 2
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# Security hardening
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

**Note:** For SQLite, use `--workers 2` to avoid database locking issues. If using PostgreSQL, you can increase to `--workers 4` or more.

### Step 2: Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable release-tracker

# Start the service
sudo systemctl start release-tracker

# Check status
sudo systemctl status release-tracker

# View logs
sudo journalctl -u release-tracker -f
```

---

## Firewall Configuration

### GCP Firewall Rules

The default HTTP/HTTPS firewall rules should already be enabled. Verify:

1. Go to **VPC Network > Firewall**
2. Ensure these rules exist:
   - `default-allow-http` (tcp:80)
   - `default-allow-https` (tcp:443)

**To create manually via CLI:**
```bash
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 --target-tags http-server

gcloud compute firewall-rules create allow-https \
  --allow tcp:443 --target-tags https-server
```

### VM-Level Firewall (UFW)

```bash
# Install and configure UFW
sudo apt install -y ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (important - don't lock yourself out!)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Verify status
sudo ufw status verbose
```

**Important:** Do NOT expose port 8000 to the internet.

---

## Verification & Testing

### Step 1: Check All Services

```bash
# Check service status
sudo systemctl status release-tracker
sudo systemctl status nginx

# Check ports
sudo ss -tlnp | grep -E '(80|443|8000)'

# Check SQLite database exists and has data
ls -la /opt/release-tracker/app/backend/release_tracker.db
sqlite3 /opt/release-tracker/app/backend/release_tracker.db "SELECT COUNT(*) FROM users;"
```

### Step 2: Test Endpoints

```bash
# Test health endpoint
curl http://localhost/health
# Expected: {"status":"healthy"}

# Test API
curl http://localhost/api/users -H "X-User-Id: 1"

# Test frontend (should return HTML)
curl http://localhost/
```

### Step 3: Browser Testing

1. Open browser to `http://your-domain.com` or `http://<VM-IP>`
2. Verify frontend loads
3. Switch users using the dropdown
4. Create a test product and release

---

## Monitoring & Maintenance

### Log Locations

| Service | Log Location |
|---------|--------------|
| Backend | `journalctl -u release-tracker` |
| nginx access | `/var/log/nginx/release-tracker-access.log` |
| nginx error | `/var/log/nginx/release-tracker-error.log` |
| Database | SQLite - no separate logs (embedded in backend) |

### Log Rotation

```bash
# Create logrotate config for nginx logs
sudo nano /etc/logrotate.d/release-tracker
```

Add:
```
/var/log/nginx/release-tracker-*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
```

### Health Check Script

```bash
# Create monitoring script
sudo nano /opt/release-tracker/health-check.sh
```

Add:
```bash
#!/bin/bash

# Health check script
HEALTH_URL="http://localhost/health"
EXPECTED='{"status":"healthy"}'

response=$(curl -s "$HEALTH_URL")

if [ "$response" == "$EXPECTED" ]; then
    echo "$(date): Health check passed"
    exit 0
else
    echo "$(date): Health check FAILED! Response: $response"
    # Optionally restart service
    # sudo systemctl restart release-tracker
    exit 1
fi
```

```bash
chmod +x /opt/release-tracker/health-check.sh

# Add to crontab for periodic checks
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/release-tracker/health-check.sh >> /var/log/release-tracker-health.log 2>&1") | crontab -
```

### Application Updates

```bash
# Update procedure
cd /opt/release-tracker/app

# Pull latest changes
sudo -u releasetracker git pull

# Update backend dependencies
cd backend
sudo -u releasetracker .venv/bin/pip install -r requirements.txt

# Run migrations
sudo -u releasetracker .venv/bin/alembic upgrade head

# Rebuild frontend
cd ../frontend
sudo -u releasetracker npm install
sudo -u releasetracker npm run build

# Restart services
sudo systemctl restart release-tracker
sudo systemctl reload nginx
```

---

## Backup & Recovery

### Database Backup Script

```bash
# Create backup script
sudo nano /opt/release-tracker/backup.sh
```

Add:
```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/opt/release-tracker/backups"
DB_FILE="/opt/release-tracker/app/backend/release_tracker.db"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/release_tracker_${TIMESTAMP}.db"

# Use SQLite's backup command for safe online backup
sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"

if [ $? -eq 0 ]; then
    # Compress the backup
    gzip "$BACKUP_FILE"
    echo "$(date): Backup created: ${BACKUP_FILE}.gz"

    # Remove old backups
    find "$BACKUP_DIR" -name "*.db.gz" -mtime +$RETENTION_DAYS -delete
    echo "$(date): Old backups cleaned up"
else
    echo "$(date): Backup FAILED!"
    exit 1
fi
```

```bash
chmod +x /opt/release-tracker/backup.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/release-tracker/backup.sh >> /var/log/release-tracker-backup.log 2>&1") | crontab -
```

### Database Restore

```bash
# Stop the service first
sudo systemctl stop release-tracker

# Restore from backup
gunzip -c /opt/release-tracker/backups/release_tracker_TIMESTAMP.db.gz > /opt/release-tracker/app/backend/release_tracker.db

# Fix ownership
sudo chown releasetracker:releasetracker /opt/release-tracker/app/backend/release_tracker.db

# Start the service
sudo systemctl start release-tracker
```

### Quick Manual Backup

For a quick manual backup:
```bash
# Simple file copy (while service is running - may have minor inconsistency)
cp /opt/release-tracker/app/backend/release_tracker.db /opt/release-tracker/backups/release_tracker_manual_$(date +%Y%m%d).db

# Or use SQLite backup command (safe for running database)
sqlite3 /opt/release-tracker/app/backend/release_tracker.db ".backup '/opt/release-tracker/backups/release_tracker_manual.db'"
```

### Full System Backup (GCP)

Create a snapshot of the VM:

```bash
gcloud compute disks snapshot release-tracker-vm \
  --zone=us-central1-a \
  --snapshot-names=release-tracker-backup-$(date +%Y%m%d)
```

---

## Troubleshooting

### Common Issues

#### Backend won't start

```bash
# Check logs
sudo journalctl -u release-tracker -n 50 --no-pager

# Common causes:
# 1. Database file permissions
ls -la /opt/release-tracker/app/backend/release_tracker.db
sudo chown releasetracker:releasetracker /opt/release-tracker/app/backend/release_tracker.db

# 2. Permission issues - check file ownership
ls -la /opt/release-tracker/app/backend/

# 3. Port already in use
sudo ss -tlnp | grep 8000
```

#### 502 Bad Gateway

```bash
# Backend not running
sudo systemctl status release-tracker

# Check nginx can reach backend
curl http://127.0.0.1:8000/health
```

#### Database errors

```bash
# Check database file exists
ls -la /opt/release-tracker/app/backend/release_tracker.db

# Check database integrity
sqlite3 /opt/release-tracker/app/backend/release_tracker.db "PRAGMA integrity_check;"

# Check database is not locked
# If locked, restart the service:
sudo systemctl restart release-tracker

# Check database has tables
sqlite3 /opt/release-tracker/app/backend/release_tracker.db ".tables"
```

#### Frontend shows blank page

```bash
# Check if build exists
ls -la /opt/release-tracker/app/frontend/dist/

# Rebuild if needed
cd /opt/release-tracker/app/frontend
sudo -u releasetracker npx vite build

# Check nginx serving correctly
curl -I http://localhost/
```

#### Database locked errors

SQLite can have locking issues with multiple workers:

```bash
# Reduce workers in systemd service
sudo nano /etc/systemd/system/release-tracker.service
# Change --workers 2 to --workers 1

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart release-tracker
```

---

## Migration to Private Cloud

This deployment is designed to be portable. Here's how to migrate to a private Linux/KVM environment:

### What Changes

| Component | GCP | Private Cloud |
|-----------|-----|---------------|
| VM | Compute Engine | KVM/QEMU VM |
| Static IP | GCP External IP | Private network IP or NAT |
| Firewall | GCP Firewall Rules | iptables/nftables/firewalld |
| SSL | Let's Encrypt or GCP-managed | Let's Encrypt or internal CA |
| Backups | GCP Snapshots | Custom backup solution |
| DNS | Cloud DNS or external | Internal DNS or /etc/hosts |

### Migration Steps

1. **Create VM** in your KVM environment with Ubuntu 22.04 LTS
2. **Copy deployment** - Follow the same steps from "Database Setup" onwards
3. **Update firewall** - Use iptables or firewalld instead of GCP firewall rules:
   ```bash
   # Using firewalld
   sudo firewall-cmd --permanent --add-service=http
   sudo firewall-cmd --permanent --add-service=https
   sudo firewall-cmd --reload
   ```
4. **SSL certificates** - Use Let's Encrypt (if public) or internal CA
5. **DNS** - Update internal DNS or load balancer configuration
6. **Backups** - Implement using local storage, NFS, or S3-compatible storage

### No GCP-Specific Dependencies

This deployment intentionally avoids:
- ❌ Google Kubernetes Engine (GKE)
- ❌ Cloud SQL (uses embedded SQLite)
- ❌ Cloud Storage (uses local filesystem)
- ❌ Cloud Load Balancing (uses nginx)
- ❌ Cloud CDN (uses nginx caching)
- ❌ GCP-specific APIs or SDKs

All components use standard Linux tools that work identically on any Linux distribution.

---

## Quick Reference

### Service Commands

```bash
# Backend
sudo systemctl start|stop|restart|status release-tracker
sudo journalctl -u release-tracker -f

# nginx
sudo systemctl start|stop|restart|reload nginx
sudo nginx -t  # Test config

# SQLite database
sqlite3 /opt/release-tracker/app/backend/release_tracker.db
```

### Important Paths

| Path | Description |
|------|-------------|
| `/opt/release-tracker/app` | Application code |
| `/opt/release-tracker/app/backend/.env` | Backend configuration |
| `/opt/release-tracker/app/backend/release_tracker.db` | SQLite database |
| `/opt/release-tracker/app/frontend/dist` | Built frontend |
| `/etc/nginx/sites-available/release-tracker` | nginx config |
| `/etc/systemd/system/release-tracker.service` | Systemd service |
| `/opt/release-tracker/backups` | Database backups |

### Default Ports

| Port | Service | Exposed? |
|------|---------|----------|
| 80 | nginx (HTTP) | Yes |
| 443 | nginx (HTTPS) | Yes |
| 8000 | Backend API | No (internal) |

---

## Security Checklist

- [ ] SSL/TLS enabled with valid certificate
- [ ] UFW firewall enabled
- [ ] Only ports 80, 443, and 22 exposed
- [ ] Backend service runs as non-root user
- [ ] Environment file has restricted permissions (600)
- [ ] SQLite database file has restricted permissions
- [ ] Regular backups configured
- [ ] Log rotation configured
- [ ] SSH key authentication (password auth disabled)

---

## Support

For issues with:
- **Application bugs**: Check GitHub issues
- **GCP infrastructure**: GCP documentation or support
- **This playbook**: Review troubleshooting section

---

*Last updated: January 2026*
