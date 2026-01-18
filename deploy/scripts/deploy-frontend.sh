#!/bin/bash
# Deploy frontend to GCP VM
# Usage: ./deploy-frontend.sh
#
# Required environment variables:
#   VITE_GOOGLE_CLIENT_ID - Google OAuth Client ID

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

log "Starting frontend deployment..."

# Check required environment variables
check_required_vars "VITE_GOOGLE_CLIENT_ID"

# Pull latest code (if not already done by backend deploy)
log "Ensuring latest code is pulled..."
run_remote "cd ${APP_DIR} && sudo git fetch origin main && sudo git reset --hard origin/main"

# Create frontend .env file with build-time variables
log "Configuring frontend environment..."
run_remote "echo 'VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}' | sudo tee ${APP_DIR}/frontend/.env > /dev/null"

# Install npm dependencies
log "Installing npm dependencies..."
run_remote "cd ${APP_DIR}/frontend && sudo npm ci --silent"

# Build frontend
log "Building frontend (this may take a minute)..."
run_remote "cd ${APP_DIR}/frontend && sudo npm run build 2>&1 || sudo npx vite build"

# Set correct ownership
log "Setting file ownership..."
run_remote "sudo chown -R ${APP_USER}:${APP_USER} ${APP_DIR}/frontend/dist"

# Verify build output
log "Verifying build output..."
run_remote "ls -la ${APP_DIR}/frontend/dist/index.html"

log "Frontend deployment complete!"
