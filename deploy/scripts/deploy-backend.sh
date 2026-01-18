#!/bin/bash
# Deploy backend to GCP VM
# Usage: ./deploy-backend.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

log "Starting backend deployment..."

# Pull latest code
log "Pulling latest code..."
run_remote "cd ${APP_DIR} && sudo git fetch origin main && sudo git reset --hard origin/main"

# Install Python dependencies
log "Installing Python dependencies..."
run_remote "cd ${APP_DIR}/backend && sudo -u ${APP_USER} .venv/bin/pip install -q -r requirements.txt"

# Run migrations
log "Running database migrations..."
"${SCRIPT_DIR}/run-migrations.sh"

# Restart backend service
log "Restarting backend service..."
run_remote "sudo systemctl restart release-tracker"

# Wait for service to start
sleep 3

# Verify service is running
log "Verifying backend service..."
run_remote "sudo systemctl is-active release-tracker"

log "Backend deployment complete!"
