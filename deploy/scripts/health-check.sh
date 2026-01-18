#!/bin/bash
# Health check for deployed application
# Usage: ./health-check.sh [--external]
#
# Options:
#   --external    Check via external URL instead of localhost

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

EXTERNAL_CHECK=false
if [[ "$1" == "--external" ]]; then
    EXTERNAL_CHECK=true
fi

log "Running health checks..."

# Check backend service status
log "Checking backend service status..."
SERVICE_STATUS=$(run_remote "sudo systemctl is-active release-tracker" || echo "inactive")
if [[ "$SERVICE_STATUS" != "active" ]]; then
    error "Backend service is not running (status: ${SERVICE_STATUS})"
    run_remote "sudo journalctl -u release-tracker --no-pager -n 20"
    exit 1
fi
log "Backend service: ${SERVICE_STATUS}"

# Check backend health endpoint (internal)
log "Checking backend health endpoint..."
HEALTH_RESPONSE=$(run_remote "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/health")
if [[ "$HEALTH_RESPONSE" != "200" ]]; then
    error "Backend health check failed (HTTP ${HEALTH_RESPONSE})"
    exit 1
fi
log "Backend health: OK (HTTP ${HEALTH_RESPONSE})"

# Check nginx status
log "Checking nginx status..."
NGINX_STATUS=$(run_remote "sudo systemctl is-active nginx" || echo "inactive")
if [[ "$NGINX_STATUS" != "active" ]]; then
    error "Nginx is not running (status: ${NGINX_STATUS})"
    exit 1
fi
log "Nginx status: ${NGINX_STATUS}"

# Check frontend via nginx
log "Checking frontend via nginx..."
FRONTEND_RESPONSE=$(run_remote "curl -s -o /dev/null -w '%{http_code}' http://localhost/")
if [[ "$FRONTEND_RESPONSE" != "200" ]]; then
    error "Frontend check failed (HTTP ${FRONTEND_RESPONSE})"
    exit 1
fi
log "Frontend: OK (HTTP ${FRONTEND_RESPONSE})"

# Check API via nginx
log "Checking API via nginx..."
API_RESPONSE=$(run_remote "curl -s -o /dev/null -w '%{http_code}' http://localhost/api/health")
if [[ "$API_RESPONSE" != "200" ]]; then
    warn "API proxy check returned HTTP ${API_RESPONSE}"
fi
log "API proxy: HTTP ${API_RESPONSE}"

# External health check (if requested)
if [[ "$EXTERNAL_CHECK" == true ]] && [[ -n "$DOMAIN" ]]; then
    log "Checking external access..."
    EXTERNAL_RESPONSE=$(curl -s -o /dev/null -w '%{http_code}' "http://${DOMAIN}/health" --max-time 10 || echo "000")
    if [[ "$EXTERNAL_RESPONSE" != "200" ]]; then
        warn "External health check returned HTTP ${EXTERNAL_RESPONSE}"
    else
        log "External access: OK (HTTP ${EXTERNAL_RESPONSE})"
    fi
fi

log "All health checks passed!"
