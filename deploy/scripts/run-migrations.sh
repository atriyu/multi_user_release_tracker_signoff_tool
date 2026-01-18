#!/bin/bash
# Run database migrations
# Usage: ./run-migrations.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

log "Running database migrations..."

# Check current migration status
log "Checking current migration status..."
CURRENT_REV=$(run_remote "cd ${APP_DIR}/backend && sudo -u ${APP_USER} .venv/bin/alembic current 2>/dev/null | grep -oE '[a-f0-9]+' | head -1" || echo "none")
log "Current revision: ${CURRENT_REV:-none}"

# Check if there are pending migrations
log "Checking for pending migrations..."
PENDING=$(run_remote "cd ${APP_DIR}/backend && sudo -u ${APP_USER} .venv/bin/alembic history --indicate-current 2>/dev/null | grep -c '^ ' || echo 0")

if [[ "$PENDING" -gt 0 ]]; then
    log "Found pending migrations. Applying..."

    # Create database backup before migration
    log "Creating database backup before migration..."
    BACKUP_FILE="release_tracker_pre_migration_$(date +%Y%m%d_%H%M%S).db"
    run_remote "sudo -u ${APP_USER} cp ${APP_DIR}/backend/release_tracker.db /opt/release-tracker/backups/${BACKUP_FILE} 2>/dev/null || true"

    # Run migrations
    log "Applying migrations..."
    run_remote "cd ${APP_DIR}/backend && sudo -u ${APP_USER} .venv/bin/alembic upgrade head"

    # Verify migration
    NEW_REV=$(run_remote "cd ${APP_DIR}/backend && sudo -u ${APP_USER} .venv/bin/alembic current 2>/dev/null | grep -oE '[a-f0-9]+' | head -1" || echo "unknown")
    log "Migration complete. New revision: ${NEW_REV}"
else
    log "No pending migrations. Database is up to date."
fi

log "Migration check complete!"
