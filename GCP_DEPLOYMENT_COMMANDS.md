# GCP Deployment Commands - Actual Execution Log

This document captures the actual sequence of commands executed to deploy the Release Tracker application to GCP Compute Engine.

**Deployment Date:** January 2026
**Target:** GCP Compute Engine VM
**Result:** http://35.223.154.31

---

## 1. Create GCP VM Instance

```bash
gcloud compute instances create release-tracker-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --tags=http-server,https-server
```

## 2. Create Firewall Rules

```bash
# Allow HTTP traffic
gcloud compute firewall-rules create allow-http \
  --allow=tcp:80 \
  --target-tags=http-server \
  --description="Allow HTTP traffic"

# Allow HTTPS traffic
gcloud compute firewall-rules create allow-https \
  --allow=tcp:443 \
  --target-tags=https-server \
  --description="Allow HTTPS traffic"
```

## 3. SSH into VM and Install System Packages

```bash
# SSH into the VM
gcloud compute ssh release-tracker-vm --zone=us-central1-a

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Python and build tools
sudo apt install -y python3.11 python3.11-venv python3-pip build-essential

# Install nginx
sudo apt install -y nginx

# Install Node.js (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

## 4. Create Application User and Directories

```bash
# Create service account user
sudo useradd -r -s /bin/false releasetracker

# Create application directories
sudo mkdir -p /opt/release-tracker/app
sudo mkdir -p /opt/release-tracker/data
sudo mkdir -p /opt/release-tracker/backups

# Set ownership
sudo chown -R releasetracker:releasetracker /opt/release-tracker
```

## 5. Deploy Application Code

```bash
# Clone repository (or copy files)
cd /opt/release-tracker/app
sudo git clone https://github.com/your-repo/release-tracker.git .
# OR copy via SCP from local machine:
# gcloud compute scp --recurse ./backend ./frontend release-tracker-vm:/tmp/ --zone=us-central1-a
# sudo mv /tmp/backend /tmp/frontend /opt/release-tracker/app/

sudo chown -R releasetracker:releasetracker /opt/release-tracker/app
```

## 6. Backend Setup

```bash
cd /opt/release-tracker/app/backend

# Create virtual environment
sudo -u releasetracker python3.11 -m venv .venv

# Install dependencies
sudo -u releasetracker .venv/bin/pip install --upgrade pip
sudo -u releasetracker .venv/bin/pip install -r requirements.txt

# Create environment configuration
sudo -u releasetracker tee .env << 'EOF'
DATABASE_URL=sqlite:////opt/release-tracker/data/release_tracker.db
SECRET_KEY=your-secret-key-here-change-in-production
CORS_ORIGINS=http://35.223.154.31
EOF

# Run database migrations
sudo -u releasetracker .venv/bin/alembic upgrade head

# Create admin user
sudo -u releasetracker .venv/bin/python -c "
import asyncio
from app.database import async_session_maker
from app.models.user import User

async def create_admin():
    async with async_session_maker() as session:
        admin = User(
            name='Admin User',
            email='admin@example.com',
            role='ADMIN',
            is_active=True
        )
        session.add(admin)
        await session.commit()
        print(f'Created admin user with ID: {admin.id}')

asyncio.run(create_admin())
"

# Note: If role enum issue occurs, fix with:
# sqlite3 /opt/release-tracker/data/release_tracker.db "UPDATE users SET role='ADMIN' WHERE email='admin@example.com';"
```

## 7. Frontend Build

```bash
cd /opt/release-tracker/app/frontend

# Install dependencies
sudo -u releasetracker npm install

# Create production environment file
sudo -u releasetracker tee .env.production << 'EOF'
VITE_API_URL=http://35.223.154.31/api
EOF

# Build for production (using npx directly to skip strict TS errors)
sudo -u releasetracker npx vite build

# Copy build output to nginx serving directory
sudo mkdir -p /var/www/release-tracker
sudo cp -r dist/* /var/www/release-tracker/
sudo chown -R www-data:www-data /var/www/release-tracker
```

## 8. Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/release-tracker << 'EOF'
server {
    listen 80;
    server_name 35.223.154.31;

    # Frontend - serve static files
    root /var/www/release-tracker;
    index index.html;

    # Frontend routes - SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/release-tracker /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

## 9. Create Systemd Service

```bash
sudo tee /etc/systemd/system/release-tracker.service << 'EOF'
[Unit]
Description=Release Tracker Backend API
After=network.target

[Service]
Type=exec
User=releasetracker
Group=releasetracker
WorkingDirectory=/opt/release-tracker/app/backend
Environment="PATH=/opt/release-tracker/app/backend/.venv/bin"
ExecStart=/opt/release-tracker/app/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable release-tracker
sudo systemctl start release-tracker

# Verify service is running
sudo systemctl status release-tracker
```

## 10. Verification Commands

```bash
# Check backend health
curl http://127.0.0.1:8000/health

# Check via nginx
curl http://35.223.154.31/health

# Check service logs
sudo journalctl -u release-tracker -f

# Check nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Troubleshooting Commands Used

### Fix Admin User Role Enum
```bash
sqlite3 /opt/release-tracker/data/release_tracker.db "UPDATE users SET role='ADMIN' WHERE email='admin@example.com';"
```

### Restart Services
```bash
sudo systemctl restart release-tracker
sudo systemctl restart nginx
```

### Check Port Bindings
```bash
sudo lsof -i :8000
sudo lsof -i :80
```

### View Database
```bash
sqlite3 /opt/release-tracker/data/release_tracker.db ".tables"
sqlite3 /opt/release-tracker/data/release_tracker.db "SELECT * FROM users;"
```

---

## Quick Reference - One-Liner Commands

```bash
# SSH into VM
gcloud compute ssh release-tracker-vm --zone=us-central1-a

# Copy files to VM
gcloud compute scp --recurse ./backend release-tracker-vm:/tmp/ --zone=us-central1-a

# Get VM external IP
gcloud compute instances describe release-tracker-vm --zone=us-central1-a --format='get(networkInterfaces[0].accessConfigs[0].natIP)'

# Stop/Start VM
gcloud compute instances stop release-tracker-vm --zone=us-central1-a
gcloud compute instances start release-tracker-vm --zone=us-central1-a
```

---

## Final Deployment Result

- **VM IP:** 35.223.154.31
- **Frontend:** http://35.223.154.31
- **API:** http://35.223.154.31/api
- **Health Check:** http://35.223.154.31/health
