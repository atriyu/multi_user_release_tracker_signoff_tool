# Quick Start Guide - Multi-User Approval System

## 🚀 Getting Started

The multi-user approval system is now fully operational in your Release Tracker application.

---

## Access the Application

### Frontend
**URL**: http://localhost:5174

**Test Users Available**:
1. **Admin User** - ID: 1 (admin@release-tracker.com)
2. **Test User 2** - ID: 2 (xyz1@abc.com)
3. **QA Lead** - ID: 3 (qa@release-tracker.com)
4. **Product Owner** - ID: 4 (po@release-tracker.com)

### Backend API
**URL**: http://localhost:8000
**Docs**: http://localhost:8000/docs

---

## Quick Workflow Demo

### Step 1: View a Release with Stakeholders
1. Go to http://localhost:5174
2. Select "Admin User" (User 1) from top-right dropdown
3. Navigate to "Releases" → Click on "11.2.7-h8" release
4. Scroll down to see:
   - **Stakeholders Card** - List of assigned stakeholders
   - **Sign-Off Matrix** - Grid view of criteria × stakeholders

### Step 2: Assign Stakeholders (Admin/Product Owner only)
1. Click "Assign Stakeholder" button in Stakeholders card
2. Select users by clicking on them (checkbox appears)
3. Click "Assign" button
4. Users appear in the stakeholders list
5. Sign-off matrix updates automatically

### Step 3: Sign Off as Different Stakeholders
1. **Switch to User 2** (Test User 2):
   - Select from user dropdown
   - Go to same release
   - Click on a yellow cell in your column
   - Click "Approve" or "Reject"
   - Add optional comment
   - Submit

2. **Switch to User 3** (QA Lead):
   - Repeat sign-off process
   - Notice status updates in real-time

3. **Observe Status Changes**:
   - Security Review: Yellow → Green (when ALL approve)
   - QA Testing: Yellow → Red (when ANY rejects)
   - Computed status column updates automatically

### Step 4: View Sign-Off Details
1. Click on any colored cell in the matrix
2. See stakeholder details, status, comment, timestamp
3. Current user can revoke their own sign-offs

---

## API Testing

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
  -H "X-User-Id: 1" | jq
```

### Create Sign-Off
```bash
curl -X POST http://localhost:8000/api/criteria/7/sign-off \
  -H "X-User-Id: 2" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved", "comment": "LGTM"}'
```

### Get Stakeholders
```bash
curl http://localhost:8000/api/releases/1/stakeholders \
  -H "X-User-Id: 1" | jq
```

### Remove Stakeholder
```bash
curl -X DELETE http://localhost:8000/api/releases/1/stakeholders/2 \
  -H "X-User-Id: 1"
```

---

## Key Features Demo

### 1. Strict Approval Logic
**Test Scenario**:
- Release 1 has 4 stakeholders
- Security Review criteria exists
- Users 2 and 3 approve → Status: **Pending** (2/4)
- User 4 approves → Status: **Pending** (3/4)
- User 1 approves → Status: **Approved** (4/4, ALL approved)

### 2. Rejection Logic
**Test Scenario**:
- All stakeholders pending on QA Testing
- User 3 rejects → Status: **Rejected** (ANY rejection)
- Even if others approve, status stays **Rejected**

### 3. Auto-Revoke
**Test Scenario**:
- User 2 approves Security Review
- User 2 changes mind and rejects
- Previous approval is automatically revoked
- Only latest sign-off counts

### 4. Stakeholder Validation
**Test Scenario**:
- User 5 (not assigned) tries to sign off
- API returns 403 Forbidden
- Only assigned stakeholders can sign off

---

## Common Operations

### Add New Release with Stakeholders
```bash
# Create release
curl -X POST http://localhost:8000/api/releases \
  -H "X-User-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "version": "1.0.0",
    "name": "Test Release",
    "status": "draft"
  }'

# Add criteria
curl -X POST http://localhost:8000/api/releases/2/criteria \
  -H "X-User-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Code Review",
    "is_mandatory": true,
    "order": 1
  }'

# Assign stakeholders
curl -X POST http://localhost:8000/api/releases/2/stakeholders \
  -H "X-User-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{"user_ids": [1, 2, 3]}'
```

### View Matrix for All Criteria
```bash
curl http://localhost:8000/api/releases/1/sign-off-matrix \
  -H "X-User-Id: 1" | jq '.criteria_matrix[] | {name: .criteria_name, status: .computed_status, signoffs: (.stakeholder_signoffs | map(select(.status != null)) | length)}'
```

---

## Color Coding Guide

### Matrix Cells
- 🟢 **Green** - Approved (stakeholder approved this criteria)
- 🔴 **Red** - Rejected (stakeholder rejected this criteria)
- 🟡 **Yellow** - Pending (stakeholder hasn't signed off yet)

### Computed Status
- ✅ **Approved** - ALL stakeholders approved
- ❌ **Rejected** - ANY stakeholder rejected
- ⏱ **Pending** - Waiting for sign-offs

---

## User Roles

### Admin (User 1)
- Can assign/remove stakeholders
- Can sign off on criteria (if assigned)
- Can approve releases
- Can manage users

### Product Owner (User 4)
- Can assign/remove stakeholders
- Can sign off on criteria (if assigned)
- Can approve releases

### Stakeholder (Users 2, 3)
- Can sign off on criteria (if assigned)
- Cannot assign other stakeholders
- Cannot approve releases

---

## Troubleshooting

### "Cannot sign off" error
**Cause**: User not assigned as stakeholder
**Solution**: Have admin assign you to the release

### Sign-off matrix not showing
**Cause**: No stakeholders assigned to release
**Solution**: Assign at least one stakeholder

### Status not updating
**Cause**: Browser cache or query cache
**Solution**: Refresh the page or clear cache

### Cannot remove stakeholder
**Cause**: Need admin/product owner role
**Solution**: Switch to admin user

---

## Test Data Included

### Release 1 ("11.2.7-h8")
**Status**: Released
**Stakeholders**: 4 users (IDs: 1, 2, 3, 4)
**Criteria**:
1. Security Review (mandatory) - Status: Pending (2/4 approved)
2. QA Testing (mandatory) - Status: Rejected (1 rejection)
3. Performance Testing (optional) - Status: Pending (0/4 signed)

### Users
1. Admin User (admin)
2. Test User 2 (stakeholder)
3. QA Lead (stakeholder)
4. Product Owner (product_owner)

---

## Next Steps

### Try These Scenarios

1. **Complete Approval Flow**:
   - Assign all stakeholders
   - Have each stakeholder approve all criteria
   - Observe status change to "Approved"

2. **Rejection Flow**:
   - Have one stakeholder reject a criteria
   - Try to get other stakeholders to approve
   - Status stays "Rejected"

3. **Remove Stakeholder**:
   - Remove a stakeholder who already signed off
   - Notice their sign-off is preserved
   - Status recomputes without their vote

4. **Multi-Release Testing**:
   - Create a new release
   - Assign different stakeholders
   - Compare matrix views

---

## Documentation

For detailed information:
- **API Reference**: `BACKEND_API_DOCUMENTATION.md`
- **Frontend Details**: `FRONTEND_IMPLEMENTATION_COMPLETE.md`
- **Complete Guide**: `MULTI_USER_APPROVAL_COMPLETE.md`
- **Design Decisions**: `MULTI_USER_APPROVAL_DESIGN.md`

---

## Support

Both backend and frontend are running and fully functional:
- ✅ Backend: http://localhost:8000
- ✅ Frontend: http://localhost:5174
- ✅ Database migrated
- ✅ Test data loaded

Ready to use! 🎉
