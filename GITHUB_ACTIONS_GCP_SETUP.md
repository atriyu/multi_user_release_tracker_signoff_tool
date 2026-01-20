# GitHub Actions GCP Deployment Setup

This guide covers setting up GitHub Actions to automatically deploy the Release Tracker application to Google Cloud Platform.

## Prerequisites

- A GCP project with billing enabled
- A GCP Compute Engine VM already provisioned (see `DEPLOYMENT_PLAYBOOK.md` for VM setup)
- Repository admin access to configure GitHub secrets

## GCP Configuration

### 1. Create a Service Account

<details>
<summary><strong>Option A: Using GCP Console (UI)</strong></summary>

1. Go to [GCP Console → IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **+ CREATE SERVICE ACCOUNT**
3. Enter details:
   - **Service account name:** `github-actions-deploy`
   - **Service account ID:** `github-actions-deploy` (auto-filled)
   - **Description:** `Service account for GitHub Actions deployments`
4. Click **CREATE AND CONTINUE**
5. Skip the "Grant this service account access" step for now (click **CONTINUE**)
6. Skip the "Grant users access" step (click **DONE**)

</details>

<details>
<summary><strong>Option B: Using gcloud CLI</strong></summary>

```bash
# Set your project ID
export PROJECT_ID="your-project-id"

# Create service account
gcloud iam service-accounts create github-actions-deploy \
  --display-name="GitHub Actions Deploy" \
  --project=$PROJECT_ID
```

</details>

### 2. Grant Required Permissions

The service account needs these IAM roles:
- **Compute Instance Admin (v1)** - For SSH access and instance management
- **Service Account User** - To act as the VM's service account
- **Compute OS Login** - For SSH authentication

<details>
<summary><strong>Option A: Using GCP Console (UI)</strong></summary>

1. Go to [GCP Console → IAM & Admin → IAM](https://console.cloud.google.com/iam-admin/iam)
2. Click **+ GRANT ACCESS**
3. In **New principals**, enter: `github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com`
4. In **Select a role**, add the following roles (click **+ ADD ANOTHER ROLE** for each):
   - `Compute Instance Admin (v1)`
   - `Service Account User`
   - `Compute OS Login`
5. Click **SAVE**

</details>

<details>
<summary><strong>Option B: Using gcloud CLI</strong></summary>

```bash
SA_EMAIL="github-actions-deploy@${PROJECT_ID}.iam.gserviceaccount.com"

# Compute Instance Admin (for SSH access)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/compute.instanceAdmin.v1"

# Service Account User (to act as the VM's service account)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Compute OS Login (for SSH)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/compute.osLogin"
```

</details>

### 3. Generate Service Account Key

<details>
<summary><strong>Option A: Using GCP Console (UI)</strong></summary>

1. Go to [GCP Console → IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click on `github-actions-deploy@...` service account
3. Go to the **KEYS** tab
4. Click **ADD KEY → Create new key**
5. Select **JSON** format
6. Click **CREATE**
7. The key file will automatically download to your computer

**Important:** Keep this file secure. You'll need its contents for GitHub secrets.

</details>

<details>
<summary><strong>Option B: Using gcloud CLI</strong></summary>

```bash
gcloud iam service-accounts keys create gcp-sa-key.json \
  --iam-account=$SA_EMAIL
```

**Important:** This creates a `gcp-sa-key.json` file. Keep it secure and delete after adding to GitHub.

</details>

### 4. Enable OS Login on VM

OS Login allows the service account to SSH into the VM.

<details>
<summary><strong>Option A: Using GCP Console (UI)</strong></summary>

1. Go to [GCP Console → Compute Engine → VM instances](https://console.cloud.google.com/compute/instances)
2. Click on your VM name (`release-tracker-vm`)
3. Click **EDIT** at the top
4. Scroll down to **Metadata**
5. Click **+ ADD ITEM**
6. Enter:
   - **Key:** `enable-oslogin`
   - **Value:** `TRUE`
7. Click **SAVE** at the bottom

</details>

<details>
<summary><strong>Option B: Using gcloud CLI</strong></summary>

```bash
gcloud compute instances add-metadata release-tracker-vm \
  --zone=us-central1-a \
  --metadata enable-oslogin=TRUE
```

</details>

## GitHub Repository Configuration

### Required Secrets

Go to **Repository Settings → Secrets and variables → Actions** and add:

| Secret Name | Description | How to Get |
|------------|-------------|-----------|
| `GCP_PROJECT_ID` | Your GCP project ID | See below |
| `GCP_SA_KEY` | Service account JSON key | Contents of downloaded JSON key file |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | See below |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | See below |
| `SECRET_KEY` | JWT signing secret | Generate with `openssl rand -hex 32` |

### Getting GCP Project ID

<details>
<summary><strong>Option A: Using GCP Console (UI)</strong></summary>

1. Go to [GCP Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top of the page
3. Your Project ID is shown in the **ID** column (not the Name)

</details>

<details>
<summary><strong>Option B: Using gcloud CLI</strong></summary>

```bash
gcloud config get-value project
```

</details>

### Getting Google OAuth Credentials

<details>
<summary><strong>Using GCP Console (UI)</strong></summary>

1. Go to [GCP Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. If you haven't created OAuth credentials yet:
   - Click **+ CREATE CREDENTIALS → OAuth client ID**
   - Select **Web application**
   - Add authorized JavaScript origins:
     - `http://localhost:5173` (development)
     - `http://YOUR_VM_EXTERNAL_IP` (production)
     - `https://yourdomain.com` (if using custom domain)
   - Click **CREATE**
3. Click on your OAuth 2.0 Client ID to view details
4. Copy the **Client ID** → use for `GOOGLE_CLIENT_ID`
5. Copy the **Client secret** → use for `GOOGLE_CLIENT_SECRET`

</details>

### Adding Secrets to GitHub

<details>
<summary><strong>Using GitHub UI</strong></summary>

1. Go to your repository on GitHub
2. Click **Settings** tab
3. In the left sidebar, click **Secrets and variables → Actions**
4. Click **New repository secret**
5. Add each secret:
   - **Name:** `GCP_PROJECT_ID`
   - **Secret:** Your project ID
   - Click **Add secret**
6. Repeat for all required secrets

**For `GCP_SA_KEY`:**
1. Open the downloaded JSON key file in a text editor
2. Copy the **entire JSON content** (including braces)
3. Paste as the secret value

</details>

**Important:** After adding `GCP_SA_KEY` to GitHub, delete the local JSON key file for security.

## Workflow Configuration

The workflow file is located at `.github/workflows/deploy.yml`.

### Environment Variables

These can be modified in the workflow file if your setup differs:

```yaml
env:
  GCP_ZONE: us-central1-a        # VM zone
  VM_NAME: release-tracker-vm     # VM instance name
  APP_DIR: /opt/release-tracker/app  # Application directory on VM
  APP_USER: releasetracker        # Linux user running the app
```

### Deployment Triggers

**Automatic deployment:** Every push to `main` branch triggers a full deployment.

**Manual deployment:** Go to Actions → Deploy to GCP → Run workflow, then select:
- `all` - Deploy backend and frontend
- `backend-only` - Deploy only backend (faster)
- `frontend-only` - Deploy only frontend

## Deployment Flow

1. **Checkout** - Clone repository
2. **Authenticate** - Authenticate to GCP using service account
3. **Configure SSH** - Set up SSH access to VM via gcloud
4. **Pull Code** - Fetch latest code on VM from `origin/main`
5. **Backend Deploy** (if selected):
   - Write `.env` file with secrets
   - Install Python dependencies
   - Create database backup
   - Run Alembic migrations
   - Restart systemd service
6. **Frontend Deploy** (if selected):
   - Write `.env` with OAuth client ID
   - Install npm dependencies
   - Build with Vite
7. **Health Check** - Verify services are running
8. **Summary** - Output deployment URL

## Verifying the Setup

### Test Service Account Access

```bash
# Activate service account locally
gcloud auth activate-service-account --key-file=gcp-sa-key.json

# Test SSH access
gcloud compute ssh release-tracker-vm --zone=us-central1-a --command="echo 'Success'"
```

### Verify IAM Permissions (Console UI)

1. Go to [GCP Console → IAM & Admin → IAM](https://console.cloud.google.com/iam-admin/iam)
2. Find `github-actions-deploy@...` in the list
3. Verify it has these roles:
   - Compute Instance Admin (v1)
   - Compute OS Login
   - Service Account User

### Test Workflow

1. Make a small commit to `main` branch
2. Go to **Actions** tab in GitHub
3. Watch the "Deploy to GCP" workflow run
4. Check the workflow summary for the deployment URL

### Manual Workflow Trigger (GitHub UI)

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select **Deploy to GCP** from the left sidebar
4. Click **Run workflow** dropdown
5. Select deployment target (`all`, `backend-only`, or `frontend-only`)
6. Click **Run workflow**

## Monitoring Deployments

### Viewing Workflow Runs (GitHub UI)

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Click on a workflow run to see details
4. Click on the **deploy** job to see step-by-step logs
5. After completion, check the **Summary** tab for the deployment URL

### Checking VM Status (GCP Console)

1. Go to [Compute Engine → VM instances](https://console.cloud.google.com/compute/instances)
2. Verify your VM shows a green checkmark (running)
3. Click **SSH** button to open a browser-based terminal
4. Run health checks manually:
   ```bash
   sudo systemctl status release-tracker
   curl http://localhost:8000/health
   curl http://localhost/
   ```

### Viewing Application Logs (GCP Console)

1. Go to [Compute Engine → VM instances](https://console.cloud.google.com/compute/instances)
2. Click on your VM name
3. Click **Serial port 1 (console)** to see boot logs
4. Or SSH in and run:
   ```bash
   sudo journalctl -u release-tracker -f  # Backend logs
   sudo tail -f /var/log/nginx/release-tracker-access.log  # Nginx access logs
   sudo tail -f /var/log/nginx/release-tracker-error.log   # Nginx error logs
   ```

## Troubleshooting

### SSH Connection Fails

```
Permission denied (publickey)
```

**Fix:** Ensure OS Login is enabled and service account has `compute.osLogin` role:
```bash
gcloud compute instances add-metadata release-tracker-vm \
  --zone=us-central1-a \
  --metadata enable-oslogin=TRUE
```

### Authentication Error

```
Error: google-github-actions/auth failed
```

**Fix:** Verify `GCP_SA_KEY` secret contains valid JSON. Re-generate if needed.

### Service Restart Fails

```
Failed to restart release-tracker.service
```

**Fix:** SSH to VM and check service status:
```bash
gcloud compute ssh release-tracker-vm --zone=us-central1-a
sudo systemctl status release-tracker
sudo journalctl -u release-tracker -n 50
```

### Health Check Fails

**Backend health fails:** Check if port 8000 is listening:
```bash
sudo ss -tlnp | grep 8000
```

**Frontend health fails:** Check nginx status:
```bash
sudo systemctl status nginx
sudo nginx -t
```

## Security Notes

- Never commit `gcp-sa-key.json` to the repository
- Rotate the service account key periodically
- The service account has limited permissions (only what's needed for deployment)
- Application secrets are injected at deploy time, not stored on VM
