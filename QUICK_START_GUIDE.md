# Quick Start Guide

Get up and running with the Release Tracker in minutes.

## Prerequisites

- Python 3.9+
- Node.js 16+
- npm

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/atriyu/multi_user_release_tracker_signoff_tool.git
cd multi_user_release_tracker_signoff_tool
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Run database migrations
.venv/bin/alembic upgrade head

# Start the server
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

## Quick Workflow Demo

### Step 1: Switch User (Development Mode)

Use the user dropdown in the top-right corner to switch between users:
- **Admin users** can manage everything
- **Product Owners** can manage releases for their products
- **Regular users** can only sign off on releases they're assigned to

### Step 2: Create a Release

1. Navigate to **Releases** > **New Release**
2. Select a product
3. Choose a template (optional)
4. Enter version and name
5. Click **Create Release**

### Step 3: Assign Stakeholders

**Note:** You are automatically assigned as a stakeholder when you create a release.

1. Open the release detail page
2. Find the **Stakeholders** card
3. Click **Assign Stakeholder** (requires admin or product owner)
4. Select additional users and click **Assign**

### Step 4: Start Review

1. Click **Start Review** to begin the sign-off process
2. Status changes from Draft to In Review

### Step 5: Collect Sign-offs

1. Switch to a stakeholder user
2. Open the release
3. In the **Sign-Off Matrix**, click on a cell in your column
4. Choose **Approve** or **Reject**
5. Add an optional comment
6. For test-related criteria (Regression, CPT), provide a **test results link**
7. Submit

### Step 6: Approve & Release

1. When all mandatory criteria are approved by all stakeholders
2. Click **Approve Release**
3. After deployment, click **Mark as Released**

## Sign-Off Matrix Color Guide

| Color | Meaning |
|-------|---------|
| Green | Approved |
| Red | Rejected |
| Yellow/Gray | Pending |

## Criteria Status Logic

| Condition | Status |
|-----------|--------|
| ANY stakeholder rejected | **Rejected** |
| ALL stakeholders approved | **Approved** |
| Otherwise | **Pending** |

## API Testing Examples

### Assign Stakeholders
```bash
curl -X POST http://localhost:8000/api/releases/1/stakeholders \
  -H "X-User-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{"user_ids": [2, 3, 4]}'
```

### Get Sign-Off Matrix
```bash
curl http://localhost:8000/api/releases/1/sign-off-matrix \
  -H "X-User-Id: 1"
```

### Create Sign-Off
```bash
curl -X POST http://localhost:8000/api/criteria/1/sign-off \
  -H "X-User-Id: 2" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved", "comment": "LGTM", "link": "https://test-results.example.com/123"}'
```

**Note:** The `link` field is required when approving Regression or CPT criteria.

## Troubleshooting

### "Cannot sign off" error
**Cause**: User not assigned as stakeholder
**Solution**: Have an admin assign the user to the release

### Sign-off matrix not showing
**Cause**: No stakeholders assigned
**Solution**: Assign at least one stakeholder first

### "Assign Stakeholder" button is disabled
**Cause**: Current user is not an admin or product owner for this product
**Solution**: Switch to a user with appropriate permissions

### Cannot remove stakeholder
**Cause**: Need admin or product owner role
**Solution**: Switch to a user with appropriate permissions

## Next Steps

- Read the [User Guide](./USER_GUIDE.md) for detailed documentation
- Check the [API Documentation](./BACKEND_API_DOCUMENTATION.md) for integration
- Explore the [README](./README.md) for project overview
