# Multi-User Approval System Design

## Overview
Redesigning the sign-off system to support multi-user approval workflow where each assigned stakeholder must individually approve release criteria.

## Database Schema Changes

### New Table: release_stakeholders
```sql
CREATE TABLE release_stakeholders (
    id INTEGER PRIMARY KEY,
    release_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (release_id, user_id)
);
```

### Modified Table: sign_offs
- Keep existing structure
- Add constraint: signed_by_id must be in release_stakeholders for that release

### Modified Table: release_criteria
- Keep existing structure
- Status becomes computed based on all stakeholder sign-offs

## Business Logic

### Criteria Status Computation
For each criteria, aggregate all sign-offs from assigned stakeholders:
- **approved**: ALL stakeholders have approved (no rejects, all approved)
- **rejected**: ANY stakeholder has rejected (even if others approved)
- **pending**: Some stakeholders haven't signed off yet OR some have revoked
- **blocked**: Manually set (special case)

### Sign-off Permissions
- Only users assigned as stakeholders to a release can sign off on its criteria
- Product owners can assign/remove stakeholders
- Each stakeholder maintains independent sign-off status

### Release Approval Rules
- Release can be "approved" status only when:
  - ALL mandatory criteria are "approved" (all stakeholders signed off)
  - Product owner explicitly approves the release

## API Changes

### New Endpoints
- `POST /releases/{id}/stakeholders` - Assign stakeholders
- `DELETE /releases/{id}/stakeholders/{user_id}` - Remove stakeholder
- `GET /releases/{id}/stakeholders` - List assigned stakeholders
- `GET /releases/{id}/sign-off-matrix` - Get matrix view of all sign-offs

### Modified Endpoints
- `POST /criteria/{id}/sign-off` - Validate user is assigned stakeholder
- `GET /releases/{id}` - Include stakeholder info and per-user sign-off status

## UI Changes

### Release Creation/Edit
- Add stakeholder selection interface
- Show list of assigned stakeholders with ability to add/remove

### Criteria Checklist View
- Show matrix: Criteria (rows) × Stakeholders (columns)
- Each cell shows that stakeholder's sign-off status for that criteria
- Current user can only sign off their own cells
- Visual indication of overall criteria status

### Dashboard
- Show per-release cards with:
  - Total criteria count
  - Per-stakeholder progress (e.g., "User A: 4/6 approved")
  - Overall release progress

### User-Specific Views
- Stakeholders see "My Releases" - only releases they're assigned to
- Show their pending sign-offs prominently

## Migration Strategy

1. Create release_stakeholders table
2. Migrate existing data:
   - For each release, create stakeholder assignments based on who has signed off
   - Or assign all active users as stakeholders to existing releases
3. Update computed criteria status based on new logic
4. Deploy backend API changes
5. Deploy frontend UI changes

## Rollout Plan

1. Phase 1: DB schema + backend API (this session)
2. Phase 2: Frontend stakeholder assignment UI
3. Phase 3: Frontend sign-off matrix view
4. Phase 4: Dashboard updates
5. Phase 5: User-specific filtered views
