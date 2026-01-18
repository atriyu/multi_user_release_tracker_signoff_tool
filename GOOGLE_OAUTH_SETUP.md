# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth authentication for the Release Tracker application.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top of the page
3. Click **New Project**
4. Enter a project name (e.g., "Release Tracker")
5. Click **Create**
6. Wait for the project to be created, then select it

## Step 2: Configure OAuth Consent Screen

Before creating credentials, you must configure the OAuth consent screen:

1. In the left sidebar, go to **APIs & Services > OAuth consent screen**
2. Select **External** (unless you have Google Workspace and want internal only)
3. Click **Create**

### Fill in App Information

| Field | Value |
|-------|-------|
| App name | Release Tracker |
| User support email | Your email address |
| App logo | Optional |
| App domain | Optional |
| Developer contact email | Your email address |

4. Click **Save and Continue**

### Configure Scopes

1. Click **Add or Remove Scopes**
2. Select the following scopes:
   - `email` - See your primary Google Account email address
   - `profile` - See your personal info
   - `openid` - Associate you with your personal info on Google
3. Click **Update**
4. Click **Save and Continue**

### Add Test Users

While your app is in "Testing" mode, only test users can sign in:

1. Click **+ Add Users**
2. Enter the email addresses of users who need to test the app
3. Click **Add**
4. Click **Save and Continue**

> **Note:** To allow any Google user to sign in, you'll need to publish your app (which may require Google verification for sensitive scopes).

## Step 3: Create OAuth Client ID

1. Go to **APIs & Services > Credentials**
2. Click **+ Create Credentials**
3. Select **OAuth client ID**

### Configure the OAuth Client

| Field | Value |
|-------|-------|
| Application type | Web application |
| Name | Release Tracker Web Client |

### Authorized JavaScript Origins

Add the origins where your app will run:

**For Local Development:**
```
http://localhost:5173
```

**For Production (with domain):**
```
https://your-domain.com
```

**For Production (IP address with nip.io):**

Google OAuth doesn't allow raw IP addresses. Use [nip.io](https://nip.io) as a workaround:

```
http://<your-ip>.nip.io
```

Example for IP `35.223.154.31`:
```
http://35.223.154.31.nip.io
```

> **Important:**
> - Use `http://` not `https://` (unless you have SSL configured)
> - No trailing slash
> - Must match exactly what's in the browser URL bar

### Authorized Redirect URIs

Leave empty - we use the popup flow which doesn't require redirect URIs.

4. Click **Create**

## Step 4: Copy Your Credentials

After creation, a dialog shows your credentials:

- **Client ID:** `xxxxxx.apps.googleusercontent.com`
- **Client Secret:** `GOCSPX-xxxxxx`

Save both values securely.

## Step 5: Configure the Application

### Backend Configuration

Create or update `backend/.env`:

```bash
# Database
DATABASE_URL=sqlite+aiosqlite:///./release_tracker.db

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# JWT Secret (generate a random string)
SECRET_KEY=your-random-secret-key-minimum-32-characters
```

Generate a secure secret key:
```bash
openssl rand -hex 32
```

### Frontend Configuration

Create or update `frontend/.env`:

```bash
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

> **Note:** The frontend only needs the Client ID (public). The Client Secret stays on the backend only.

## Step 6: Using nip.io for IP-based Deployments

If you're deploying to a server with only an IP address (no domain), use nip.io:

### What is nip.io?

nip.io is a free DNS service that maps any IP address to a hostname:
- `10.0.0.1.nip.io` → resolves to `10.0.0.1`
- `app.10.0.0.1.nip.io` → resolves to `10.0.0.1`

### Configure nginx for nip.io

Update your nginx `server_name` to include the nip.io hostname:

```nginx
server {
    listen 80;
    server_name 35.223.154.31 35.223.154.31.nip.io;

    # ... rest of config
}
```

Reload nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Access Your App

Use the nip.io URL in your browser:
```
http://35.223.154.31.nip.io
```

## Step 7: Run Database Migration

The OAuth feature requires additional database fields. Run the migration:

```bash
cd backend
.venv/bin/alembic upgrade head
```

## Step 8: Create an Admin User

New users are created automatically on first Google sign-in, but they're regular users by default.

### Option 1: Make yourself admin after signing in

```bash
sqlite3 release_tracker.db "
  UPDATE users SET is_admin = 1, role = 'ADMIN'
  WHERE email = 'your-email@gmail.com';
"
```

### Option 2: Make the first user admin

The first user to sign in can be manually promoted to admin using the command above.

## Step 9: Test the Setup

1. Start the backend:
   ```bash
   cd backend
   .venv/bin/uvicorn app.main:app --reload --port 8000
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open http://localhost:5173 (or your production URL)

4. Click **Sign in with Google**

5. Select your Google account (must be a test user if app is in testing mode)

6. You should be redirected to the dashboard

## Troubleshooting

### "Access Blocked" Error

**Cause:** Your email is not in the test users list.

**Fix:** Add your email to test users in OAuth consent screen, or publish the app.

### "This app doesn't comply with Google's OAuth 2.0 policy"

**Possible causes:**
1. OAuth consent screen not fully configured
2. Missing required fields (app name, support email, developer email)
3. Authorized JavaScript origins don't match exactly

**Fix:** Verify all OAuth consent screen fields are filled and origins match exactly.

### "redirect_uri_mismatch" Error

**Cause:** The origin in your browser doesn't match authorized JavaScript origins.

**Fix:** Add the exact URL (including port) to authorized JavaScript origins.

### Sign-in Works but API Returns 401

**Cause:** Backend doesn't have the correct GOOGLE_CLIENT_ID.

**Fix:** Ensure `backend/.env` has the same Client ID as the frontend.

### "Invalid token" Error

**Cause:** Client ID mismatch between frontend and backend, or token expired.

**Fix:**
1. Verify both `.env` files have the same Client ID
2. Try signing out and signing in again

## Security Considerations

1. **Never commit `.env` files** - Add them to `.gitignore`
2. **Use strong SECRET_KEY** - At least 32 random characters
3. **HTTPS in production** - Use SSL/TLS for production deployments
4. **Rotate secrets** - Periodically rotate your Client Secret and JWT Secret Key
5. **Limit test users** - Only add necessary users during testing phase

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Identity Services](https://developers.google.com/identity/gsi/web)
- [nip.io - Dead simple wildcard DNS](https://nip.io)
