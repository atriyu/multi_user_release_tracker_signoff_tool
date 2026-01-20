#!/bin/bash
# =============================================================================
# Release Tracker - Deployment Script
# =============================================================================
# Reusable deployment script for initial setup and updates.
# Pulls code, installs dependencies, runs migrations, builds frontend.
#
# Usage:
#   sudo ./deploy.sh [options]
#
# Options:
#   --branch <name>      Deploy specific branch (default: main)
#   --tag <version>      Deploy specific tag
#   --backend-only       Skip frontend deployment
#   --frontend-only      Skip backend deployment
#   --skip-migrations    Skip database migrations
#   --skip-health-check  Skip health verification
#
# Examples:
#   sudo ./deploy.sh                    # Deploy latest from main
#   sudo ./deploy.sh --branch develop   # Deploy develop branch
#   sudo ./deploy.sh --tag v1.2.0       # Deploy specific tag
#   sudo ./deploy.sh --backend-only     # Backend-only update
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
# Parse Arguments
# =============================================================================

DEPLOY_BRANCH=""
DEPLOY_TAG=""
DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true
SKIP_MIGRATIONS=false
SKIP_HEALTH_CHECK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --branch)
            DEPLOY_BRANCH="$2"
            shift 2
            ;;
        --tag)
            DEPLOY_TAG="$2"
            shift 2
            ;;
        --backend-only)
            DEPLOY_FRONTEND=false
            shift
            ;;
        --frontend-only)
            DEPLOY_BACKEND=false
            shift
            ;;
        --skip-migrations)
            SKIP_MIGRATIONS=true
            shift
            ;;
        --skip-health-check)
            SKIP_HEALTH_CHECK=true
            shift
            ;;
        -h|--help)
            head -35 "$0" | tail -30
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Can't specify both branch and tag
if [[ -n "$DEPLOY_BRANCH" && -n "$DEPLOY_TAG" ]]; then
    die "Cannot specify both --branch and --tag"
fi

# =============================================================================
# Validation
# =============================================================================

# Check running as root
if [[ $EUID -ne 0 ]]; then
    die "This script must be run as root (use sudo)"
fi

# Load environment configuration
CONFIG_FILE="/opt/release-tracker/config/.env"
if [[ -f "$CONFIG_FILE" ]]; then
    log "Loading configuration from ${CONFIG_FILE}"
    set -a
    source "$CONFIG_FILE"
    set +a
else
    die "Configuration file not found at ${CONFIG_FILE}"
fi

# Set defaults
APP_DIR="${APP_DIR:-/opt/release-tracker/app}"
APP_USER="${APP_USER:-releasetracker}"
REPO_BRANCH="${REPO_BRANCH:-main}"

# Use configured branch if no override specified
if [[ -z "$DEPLOY_BRANCH" && -z "$DEPLOY_TAG" ]]; then
    DEPLOY_BRANCH="${REPO_BRANCH}"
fi

# Validate app directory exists
if [[ ! -d "${APP_DIR}/.git" ]]; then
    die "Repository not found at ${APP_DIR}. Run provision.sh first."
fi

# =============================================================================
# Display Configuration
# =============================================================================

log "=========================================="
log "Release Tracker Deployment"
log "=========================================="
log "App Directory: ${APP_DIR}"
log "App User: ${APP_USER}"
if [[ -n "$DEPLOY_TAG" ]]; then
    log "Deploy Tag: ${DEPLOY_TAG}"
else
    log "Deploy Branch: ${DEPLOY_BRANCH}"
fi
log "Deploy Backend: ${DEPLOY_BACKEND}"
log "Deploy Frontend: ${DEPLOY_FRONTEND}"
log "Skip Migrations: ${SKIP_MIGRATIONS}"
log "Skip Health Check: ${SKIP_HEALTH_CHECK}"
log "=========================================="

# =============================================================================
# Git Operations
# =============================================================================

log "Updating code from repository..."

cd "${APP_DIR}"

# Configure git safe directory
git config --global --add safe.directory "${APP_DIR}"

# Fetch latest from origin
git fetch origin --tags

# Checkout branch or tag
if [[ -n "$DEPLOY_TAG" ]]; then
    log "Checking out tag: ${DEPLOY_TAG}"
    git checkout "tags/${DEPLOY_TAG}"
else
    log "Checking out branch: ${DEPLOY_BRANCH}"
    git checkout "${DEPLOY_BRANCH}"
    git pull origin "${DEPLOY_BRANCH}"
fi

# Get current commit info
CURRENT_COMMIT=$(git rev-parse --short HEAD)
CURRENT_COMMIT_MSG=$(git log -1 --pretty=%B | head -1)
log "Current commit: ${CURRENT_COMMIT} - ${CURRENT_COMMIT_MSG}"

# Set ownership after git operations
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

# =============================================================================
# Backend Deployment
# =============================================================================

if [[ "$DEPLOY_BACKEND" == true ]]; then
    log ""
    log "=========================================="
    log "Deploying Backend"
    log "=========================================="

    cd "${APP_DIR}/backend"

    # Install Python dependencies
    log "Installing Python dependencies..."
    sudo -u "${APP_USER}" .venv/bin/pip install -q -r requirements.txt

    # Create backend .env file
    log "Configuring backend environment..."
    cat > .env << ENVEOF
DATABASE_URL=${DATABASE_URL:-sqlite+aiosqlite:///./release_tracker.db}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
SECRET_KEY=${SECRET_KEY}
DEBUG=${DEBUG:-false}
ENVEOF
    chown "${APP_USER}:${APP_USER}" .env
    chmod 600 .env

    # Run database migrations
    if [[ "$SKIP_MIGRATIONS" != true ]]; then
        log "Running database migrations..."

        # Check for pending migrations
        CURRENT_REV=$(sudo -u "${APP_USER}" .venv/bin/alembic current 2>/dev/null | grep -oE '[a-f0-9]+' | head -1 || echo "none")
        log "Current revision: ${CURRENT_REV:-none}"

        # Create database backup before migration
        if [[ -f "release_tracker.db" ]]; then
            BACKUP_FILE="release_tracker_pre_migration_$(date +%Y%m%d_%H%M%S).db"
            log "Creating database backup: ${BACKUP_FILE}"
            sudo -u "${APP_USER}" cp release_tracker.db "/opt/release-tracker/backups/${BACKUP_FILE}"
        fi

        # Run migrations
        log "Applying migrations..."
        sudo -u "${APP_USER}" .venv/bin/alembic upgrade head

        # Verify migration
        NEW_REV=$(sudo -u "${APP_USER}" .venv/bin/alembic current 2>/dev/null | grep -oE '[a-f0-9]+' | head -1 || echo "unknown")
        log "Migration complete. New revision: ${NEW_REV}"
    else
        log "Skipping database migrations (--skip-migrations)"
    fi

    # Restart backend service
    log "Restarting backend service..."
    systemctl restart release-tracker
    sleep 3

    log "Backend deployment complete!"
fi

# =============================================================================
# Frontend Deployment
# =============================================================================

if [[ "$DEPLOY_FRONTEND" == true ]]; then
    log ""
    log "=========================================="
    log "Deploying Frontend"
    log "=========================================="

    cd "${APP_DIR}/frontend"

    # Install npm dependencies
    log "Installing npm dependencies..."
    npm ci --silent 2>/dev/null || npm install --silent

    # Create frontend .env file
    log "Configuring frontend environment..."
    echo "VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}" > .env
    chown "${APP_USER}:${APP_USER}" .env

    # Build frontend
    log "Building frontend..."
    npm run build

    # Set ownership
    chown -R "${APP_USER}:${APP_USER}" dist

    log "Frontend deployment complete!"
fi

# =============================================================================
# Health Checks
# =============================================================================

if [[ "$SKIP_HEALTH_CHECK" != true ]]; then
    log ""
    log "=========================================="
    log "Running Health Checks"
    log "=========================================="

    HEALTH_OK=true

    # Check backend service status
    log "Checking backend service status..."
    SERVICE_STATUS=$(systemctl is-active release-tracker || echo "inactive")
    if [[ "$SERVICE_STATUS" != "active" ]]; then
        error "Backend service is not running (status: ${SERVICE_STATUS})"
        warn "Recent logs:"
        journalctl -u release-tracker --no-pager -n 20
        HEALTH_OK=false
    else
        log "Backend service: ${SERVICE_STATUS}"
    fi

    # Check backend health endpoint
    if [[ "$HEALTH_OK" == true ]]; then
        log "Checking backend health endpoint..."
        sleep 2  # Give service time to start
        HEALTH_RESPONSE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/health --max-time 10 || echo "000")
        if [[ "$HEALTH_RESPONSE" != "200" ]]; then
            error "Backend health check failed (HTTP ${HEALTH_RESPONSE})"
            HEALTH_OK=false
        else
            log "Backend health: OK (HTTP ${HEALTH_RESPONSE})"
        fi
    fi

    # Check nginx status
    log "Checking nginx status..."
    NGINX_STATUS=$(systemctl is-active nginx || echo "inactive")
    if [[ "$NGINX_STATUS" != "active" ]]; then
        error "Nginx is not running (status: ${NGINX_STATUS})"
        HEALTH_OK=false
    else
        log "Nginx status: ${NGINX_STATUS}"
    fi

    # Check frontend via nginx
    if [[ "$HEALTH_OK" == true ]]; then
        log "Checking frontend via nginx..."
        FRONTEND_RESPONSE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/ --max-time 10 || echo "000")
        if [[ "$FRONTEND_RESPONSE" != "200" ]]; then
            error "Frontend check failed (HTTP ${FRONTEND_RESPONSE})"
            HEALTH_OK=false
        else
            log "Frontend: OK (HTTP ${FRONTEND_RESPONSE})"
        fi
    fi

    # Check API via nginx
    if [[ "$HEALTH_OK" == true ]]; then
        log "Checking API via nginx..."
        API_RESPONSE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/health --max-time 10 || echo "000")
        if [[ "$API_RESPONSE" != "200" ]]; then
            warn "API proxy check returned HTTP ${API_RESPONSE}"
        else
            log "API proxy: OK (HTTP ${API_RESPONSE})"
        fi
    fi

    if [[ "$HEALTH_OK" != true ]]; then
        die "Health checks failed!"
    fi

    log "All health checks passed!"
else
    log ""
    log "Skipping health checks (--skip-health-check)"
fi

# =============================================================================
# Deployment Summary
# =============================================================================

log ""
log "=========================================="
log "Deployment Complete!"
log "=========================================="
log ""
log "Deployed commit: ${CURRENT_COMMIT} - ${CURRENT_COMMIT_MSG}"
if [[ -n "$DEPLOY_TAG" ]]; then
    log "Tag: ${DEPLOY_TAG}"
else
    log "Branch: ${DEPLOY_BRANCH}"
fi
log ""

# Get IP address
IP_ADDR=$(hostname -I | awk '{print $1}')
log "Application URL: http://${IP_ADDR}/"
log ""
log "=========================================="
