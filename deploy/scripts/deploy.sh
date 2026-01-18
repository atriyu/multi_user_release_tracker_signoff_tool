#!/bin/bash
# Main deployment script for Release Tracker
# Usage: ./deploy.sh [--backend-only|--frontend-only|--skip-health-check]
#
# Required environment variables:
#   GCP_ZONE              - GCP zone (default: us-central1-a)
#   VM_NAME               - VM instance name (default: release-tracker-vm)
#   VITE_GOOGLE_CLIENT_ID - Google OAuth Client ID (for frontend)
#   GOOGLE_CLIENT_ID      - Google OAuth Client ID (for backend)
#   GOOGLE_CLIENT_SECRET  - Google OAuth Client Secret (for backend)
#   SECRET_KEY            - JWT Secret Key (for backend)
#
# Optional environment variables:
#   DOMAIN                - Domain name for external health check

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# Parse arguments
DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true
SKIP_HEALTH_CHECK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-only)
            DEPLOY_FRONTEND=false
            shift
            ;;
        --frontend-only)
            DEPLOY_BACKEND=false
            shift
            ;;
        --skip-health-check)
            SKIP_HEALTH_CHECK=true
            shift
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

log "=========================================="
log "Release Tracker Deployment"
log "=========================================="
log "VM: ${VM_NAME}"
log "Zone: ${GCP_ZONE}"
log "Deploy Backend: ${DEPLOY_BACKEND}"
log "Deploy Frontend: ${DEPLOY_FRONTEND}"
log "=========================================="

# Validate gcloud setup
check_gcloud

# Validate required environment variables
if [[ "$DEPLOY_FRONTEND" == true ]]; then
    check_required_vars "VITE_GOOGLE_CLIENT_ID"
fi

if [[ "$DEPLOY_BACKEND" == true ]]; then
    check_required_vars "GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET" "SECRET_KEY"
fi

# Test SSH connectivity
log "Testing SSH connectivity to VM..."
run_remote "echo 'SSH connection successful'" || die "Cannot connect to VM via SSH"

# Configure git safe directory (needed for root operations)
log "Configuring git..."
run_remote "sudo git config --global --add safe.directory ${APP_DIR} 2>/dev/null || true"

# Deploy backend
if [[ "$DEPLOY_BACKEND" == true ]]; then
    log ""
    log "=========================================="
    log "Deploying Backend"
    log "=========================================="

    # Pull latest code
    log "Pulling latest code..."
    run_remote "cd ${APP_DIR} && sudo git fetch origin main && sudo git reset --hard origin/main"

    # Update backend .env file
    log "Configuring backend environment..."
    run_remote "sudo tee ${APP_DIR}/backend/.env > /dev/null << 'ENVEOF'
DATABASE_URL=sqlite+aiosqlite:///./release_tracker.db
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
SECRET_KEY=${SECRET_KEY}
DEBUG=false
ENVEOF"

    # Install Python dependencies
    log "Installing Python dependencies..."
    run_remote "cd ${APP_DIR}/backend && sudo -u ${APP_USER} .venv/bin/pip install -q -r requirements.txt"

    # Run migrations BEFORE restarting service
    log "Running database migrations..."
    "${SCRIPT_DIR}/run-migrations.sh"

    # Restart backend service
    log "Restarting backend service..."
    run_remote "sudo systemctl restart release-tracker"
    sleep 3

    log "Backend deployment complete!"
fi

# Deploy frontend
if [[ "$DEPLOY_FRONTEND" == true ]]; then
    log ""
    log "=========================================="
    log "Deploying Frontend"
    log "=========================================="

    # Ensure code is pulled (may have been done by backend)
    if [[ "$DEPLOY_BACKEND" != true ]]; then
        log "Pulling latest code..."
        run_remote "cd ${APP_DIR} && sudo git fetch origin main && sudo git reset --hard origin/main"
    fi

    # Create frontend .env file
    log "Configuring frontend environment..."
    run_remote "echo 'VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}' | sudo tee ${APP_DIR}/frontend/.env > /dev/null"

    # Install npm dependencies
    log "Installing npm dependencies..."
    run_remote "cd ${APP_DIR}/frontend && sudo npm ci --silent 2>/dev/null || sudo npm install --silent"

    # Build frontend
    log "Building frontend..."
    run_remote "cd ${APP_DIR}/frontend && sudo npm run build 2>&1 || sudo npx vite build"

    # Set ownership
    run_remote "sudo chown -R ${APP_USER}:${APP_USER} ${APP_DIR}/frontend/dist"

    log "Frontend deployment complete!"
fi

# Run health checks
if [[ "$SKIP_HEALTH_CHECK" != true ]]; then
    log ""
    log "=========================================="
    log "Running Health Checks"
    log "=========================================="
    "${SCRIPT_DIR}/health-check.sh"
fi

log ""
log "=========================================="
log "Deployment Complete!"
log "=========================================="
if [[ -n "$DOMAIN" ]]; then
    log "Application URL: http://${DOMAIN}"
else
    # Get external IP
    EXTERNAL_IP=$(gcloud compute instances describe "${VM_NAME}" --zone="${GCP_ZONE}" --format='get(networkInterfaces[0].accessConfigs[0].natIP)' 2>/dev/null || echo "unknown")
    log "Application URL: http://${EXTERNAL_IP}"
    log "Application URL (nip.io): http://${EXTERNAL_IP}.nip.io"
fi
