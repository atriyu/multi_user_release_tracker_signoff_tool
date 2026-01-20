#!/bin/bash
# =============================================================================
# Release Tracker - Ubuntu VM Provisioning Script
# =============================================================================
# One-time provisioning script for Ubuntu 22.04+ VMs.
# Sets up system packages, creates users, clones repository, and configures services.
#
# Usage:
#   sudo ./provision.sh
#
# Prerequisites:
#   - Ubuntu 22.04 or later
#   - Root/sudo access
#   - .env file in the same directory (copy from env.example)
#   - Network access to the git repository
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

die() {
    error "$1"
    exit 1
}

# =============================================================================
# Validation
# =============================================================================

# Check running as root
if [[ $EUID -ne 0 ]]; then
    die "This script must be run as root (use sudo)"
fi

# Find script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment configuration
if [[ -f "${SCRIPT_DIR}/.env" ]]; then
    log "Loading configuration from ${SCRIPT_DIR}/.env"
    set -a
    source "${SCRIPT_DIR}/.env"
    set +a
elif [[ -f "/opt/release-tracker/config/.env" ]]; then
    log "Loading configuration from /opt/release-tracker/config/.env"
    set -a
    source "/opt/release-tracker/config/.env"
    set +a
else
    die "Configuration file not found. Copy env.example to .env and configure it."
fi

# Validate required variables
REQUIRED_VARS="REPO_URL SECRET_KEY GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET VITE_GOOGLE_CLIENT_ID"
MISSING_VARS=""
for var in $REQUIRED_VARS; do
    if [[ -z "${!var}" || "${!var}" == "<"* ]]; then
        MISSING_VARS="${MISSING_VARS} ${var}"
    fi
done
if [[ -n "$MISSING_VARS" ]]; then
    die "Missing or unconfigured required variables:${MISSING_VARS}"
fi

# Set defaults
APP_DIR="${APP_DIR:-/opt/release-tracker/app}"
APP_USER="${APP_USER:-releasetracker}"
REPO_BRANCH="${REPO_BRANCH:-main}"
SERVER_NAME="${SERVER_NAME:-_}"

log "=========================================="
log "Release Tracker Provisioning"
log "=========================================="
log "Repository: ${REPO_URL}"
log "Branch: ${REPO_BRANCH}"
log "App Directory: ${APP_DIR}"
log "App User: ${APP_USER}"
log "=========================================="

# =============================================================================
# Install System Packages
# =============================================================================

log "Installing system packages..."

# Update package lists
apt-get update -qq

# Install prerequisites
apt-get install -y -qq \
    curl \
    git \
    software-properties-common \
    gnupg2

# Add deadsnakes PPA for Python 3.11
if ! command -v python3.11 &> /dev/null; then
    log "Adding Python 3.11 repository..."
    add-apt-repository -y ppa:deadsnakes/ppa
    apt-get update -qq
fi

# Install Python 3.11
log "Installing Python 3.11..."
apt-get install -y -qq \
    python3.11 \
    python3.11-venv \
    python3.11-dev

# Install Node.js 20.x
if ! command -v node &> /dev/null || [[ $(node --version | cut -d. -f1 | tr -d 'v') -lt 20 ]]; then
    log "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
fi

# Install nginx
log "Installing nginx..."
apt-get install -y -qq nginx

log "System packages installed successfully"
log "Python version: $(python3.11 --version)"
log "Node version: $(node --version)"
log "npm version: $(npm --version)"
log "nginx version: $(nginx -v 2>&1)"

# =============================================================================
# Create Application User and Directory Structure
# =============================================================================

log "Creating application user and directories..."

# Create system user (no login, no home directory)
if ! id "${APP_USER}" &>/dev/null; then
    useradd --system --no-create-home --shell /usr/sbin/nologin "${APP_USER}"
    log "Created system user: ${APP_USER}"
else
    log "User ${APP_USER} already exists"
fi

# Create directory structure
mkdir -p /opt/release-tracker/{app,backups,config,data}

# Set initial ownership
chown -R "${APP_USER}:${APP_USER}" /opt/release-tracker

log "Directory structure created"

# =============================================================================
# Clone Repository
# =============================================================================

log "Cloning repository..."

if [[ -d "${APP_DIR}/.git" ]]; then
    warn "Repository already exists at ${APP_DIR}"
    log "Updating existing repository..."
    cd "${APP_DIR}"
    git fetch origin
    git checkout "${REPO_BRANCH}"
    git pull origin "${REPO_BRANCH}"
else
    # Clone as root, will set ownership later
    git clone --branch "${REPO_BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

# Configure git safe directory
git config --global --add safe.directory "${APP_DIR}"

# Set ownership
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

log "Repository cloned successfully"

# =============================================================================
# Setup Python Virtual Environment
# =============================================================================

log "Setting up Python virtual environment..."

cd "${APP_DIR}/backend"

# Create virtual environment
if [[ ! -d ".venv" ]]; then
    sudo -u "${APP_USER}" python3.11 -m venv .venv
    log "Virtual environment created"
else
    log "Virtual environment already exists"
fi

# Upgrade pip
sudo -u "${APP_USER}" .venv/bin/pip install --upgrade pip -q

log "Python environment ready"

# =============================================================================
# Copy Configuration
# =============================================================================

log "Copying configuration files..."

# Copy .env to persistent config location
cp "${SCRIPT_DIR}/.env" /opt/release-tracker/config/.env
chown root:root /opt/release-tracker/config/.env
chmod 600 /opt/release-tracker/config/.env

log "Configuration copied to /opt/release-tracker/config/.env"

# =============================================================================
# Install Systemd Service
# =============================================================================

log "Installing systemd service..."

# Copy service file
cp "${APP_DIR}/deploy/config/release-tracker.service" /etc/systemd/system/

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable release-tracker

log "Systemd service installed and enabled"

# =============================================================================
# Configure Nginx
# =============================================================================

log "Configuring nginx..."

# Create nginx configuration from template
NGINX_CONFIG="/etc/nginx/sites-available/release-tracker"
cat > "${NGINX_CONFIG}" << 'NGINX_EOF'
# Nginx configuration for Release Tracker
# Auto-generated by provision.sh

upstream backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name SERVER_NAME_PLACEHOLDER;

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

    # Health check endpoint
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

    access_log /var/log/nginx/release-tracker-access.log;
    error_log /var/log/nginx/release-tracker-error.log;
}
NGINX_EOF

# Replace server name placeholder
sed -i "s/SERVER_NAME_PLACEHOLDER/${SERVER_NAME}/g" "${NGINX_CONFIG}"

# Enable site
ln -sf "${NGINX_CONFIG}" /etc/nginx/sites-enabled/release-tracker

# Disable default site
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx

log "Nginx configured and reloaded"

# =============================================================================
# Run Initial Deployment
# =============================================================================

log "Running initial deployment..."

# Make deploy script executable
chmod +x "${APP_DIR}/deploy/private-cloud/deploy.sh"

# Run deployment
"${APP_DIR}/deploy/private-cloud/deploy.sh"

# =============================================================================
# Print Success Message
# =============================================================================

log ""
log "=========================================="
log "Provisioning Complete!"
log "=========================================="
log ""
log "The Release Tracker application has been installed and started."
log ""
log "Directory structure:"
log "  ${APP_DIR}           - Application code"
log "  /opt/release-tracker/backups  - Database backups"
log "  /opt/release-tracker/config   - Persistent configuration"
log ""
log "Useful commands:"
log "  sudo systemctl status release-tracker    - Check service status"
log "  sudo journalctl -u release-tracker -f    - View backend logs"
log "  sudo tail -f /var/log/nginx/release-tracker-*.log  - View nginx logs"
log ""
log "To deploy updates:"
log "  cd ${APP_DIR}"
log "  sudo ./deploy/private-cloud/deploy.sh"
log ""

# Get IP address
IP_ADDR=$(hostname -I | awk '{print $1}')
log "Access the application at:"
log "  http://${IP_ADDR}/"
log ""
log "=========================================="
