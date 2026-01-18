#!/bin/bash
# Common variables and functions for deployment scripts

# Configuration - can be overridden by environment variables
export GCP_PROJECT="${GCP_PROJECT:-}"
export GCP_ZONE="${GCP_ZONE:-us-central1-a}"
export VM_NAME="${VM_NAME:-release-tracker-vm}"
export APP_DIR="${APP_DIR:-/opt/release-tracker/app}"
export APP_USER="${APP_USER:-releasetracker}"
export DOMAIN="${DOMAIN:-}"

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

# Run command on remote VM via gcloud SSH
run_remote() {
    local cmd="$1"
    local timeout="${2:-300}"

    gcloud compute ssh "${VM_NAME}" \
        --zone="${GCP_ZONE}" \
        --command="${cmd}" \
        --quiet \
        -- -o ConnectTimeout=30 -o ServerAliveInterval=10
}

# Copy file to remote VM
copy_to_remote() {
    local src="$1"
    local dest="$2"

    gcloud compute scp "${src}" "${VM_NAME}:${dest}" \
        --zone="${GCP_ZONE}" \
        --quiet
}

# Check if required environment variables are set
check_required_vars() {
    local missing=0
    for var in "$@"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable ${var} is not set"
            missing=1
        fi
    done
    if [[ $missing -eq 1 ]]; then
        exit 1
    fi
}

# Validate gcloud is configured
check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        die "gcloud CLI is not installed"
    fi

    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 | grep -q '@'; then
        die "gcloud is not authenticated. Run 'gcloud auth login'"
    fi
}
