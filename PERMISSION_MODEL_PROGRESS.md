# Permission Model Migration - Progress Report

## Overview

We're migrating from a **role-based** system to a **permission-based** system to eliminate confusion and add flexibility.

### Why This Change?

**Old System Problems**:
- ❌ "Product Owner" role was global but sounded product-specific (confusing!)
- ❌ "Stakeholder" was both a role AND a release assignment (very confusing!)
- ❌ Couldn't have multiple product owners per product
- ❌ Product owners had global permissions on ALL products

**New System Benefits**:
- ✅ Clear separation: System admin vs. Product permissions vs. Release permissions
- ✅ Multiple product owners per product
- ✅ Product owners only have permissions on their products
- ✅ "Stakeholder" is now ONLY a release-specific assignment (not a role)

---

## Progress So Far (50% Complete)

### ✅ Completed Backend Work

#### 1. Database Schema ✅
- Created `ProductPermission` model
- Added `is_admin` boolean to `User` model
- Made `role` column nullable (deprecated but kept for compatibility)
- Migration successfully applied

#### 2. Data Migration ✅
- Converted `admin` role → `is_admin = True`
- Converted `product_owner` role → `ProductPermission` records for all products
- User ID 1 (Admin User): is_admin = 1
- User ID 4 (Product Owner): has product_owner permission on all 3 products

#### 3. Model Relationships ✅
- `User.product_permissions` relationship
- `Product.permissions` relationship
- Proper foreign keys and cascades

---

## Remaining Work (50% Left)

### Backend (Estimated: ~2-3 hours)

#### 1. Create Pydantic Schemas
```python
# Need to create:
- ProductPermissionResponse
- ProductPermissionCreate
- Update UserResponse to include is_admin and product_permissions
```

#### 2. New Permission Dependencies
Replace existing role-based dependencies with permission-based:
```python
# Old (role-based):
RequireAdmin  # Check user.role == 'admin'
RequireAdminOrProductOwner  # Check user.role in ['admin', 'product_owner']

# New (permission-based):
RequireSystemAdmin  # Check user.is_admin == True
RequireProductOwner(product_id)  # Check ProductPermission exists for product
RequireProductOwnerOrAdmin(product_id)  # Check is_admin OR ProductPermission
```

#### 3. Update API Endpoints
Need to update permission checks in:
- `/api/products` - Only admins can create
- `/api/releases` - Only product owners (of that product) can create
- `/api/releases/{id}/stakeholders` - Only product owners or admins can assign
- All other endpoints that currently use `RequireAdmin` or `RequireAdminOrProductOwner`

#### 4. Product Permission Management API
New endpoints needed:
```
POST   /api/products/{id}/permissions  # Grant product owner permission
GET    /api/products/{id}/permissions  # List product owners
DELETE /api/products/{id}/permissions/{user_id}  # Revoke permission
```

### Frontend (Estimated: ~2-3 hours)

#### 1. Update TypeScript Types
```typescript
interface User {
  is_admin: boolean;
  role?: UserRole;  // deprecated
  product_permissions?: ProductPermission[];
}

interface ProductPermission {
  id: number;
  product_id: number;
  user_id: number;
  permission_type: string;
  granted_at: string;
}
```

#### 2. User Management UI Updates
- User creation: Add "Is Admin" checkbox (remove role dropdown)
- User editing: Show admin status and product permissions

#### 3. Product Permission Management UI
New component needed:
- `ProductOwnerManager.tsx` - Assign/remove product owners for a product
- Shows list of product owners
- Add/remove product owner functionality

#### 4. Update Permission Checks Throughout App
Replace role checks with permission checks:
```typescript
// Old:
if (user.role === 'admin') { ... }

// New:
if (user.is_admin) { ... }
```

---

## Decision Point: Continue or Pause?

We're at 50% completion. The database migration is done and working. However, there's significant work remaining.

### Option 1: Complete Full Implementation
**Time**: ~4-6 more hours
**Pros**:
- Clean, flexible permission model
- No more confusion
- Multi-product-owner support

**Cons**:
- Significant refactoring needed
- Risk of breaking existing functionality
- Need thorough testing

### Option 2: Hybrid Approach (Recommended)
**Time**: ~1-2 hours
**What**: Keep new permission model in database, but add backward-compatible layer

**How**:
1. Keep existing role-based dependencies working
2. Add helper properties to User model:
   ```python
   @property
   def has_product_owner_role(self) -> bool:
       return self.is_admin or len(self.product_permissions) > 0
   ```
3. Gradually migrate to permission checks
4. Add product permission management UI (new feature)
5. Eventually phase out role field

**Pros**:
- Nothing breaks
- Can test incrementally
- Users get new feature immediately
- Migration path is gradual

**Cons**:
- Temporary code complexity
- Role field stays around longer

### Option 3: Rollback
**Time**: ~15 minutes
**What**: Revert migration, keep role-based system

**Pros**:
- Back to working state quickly
- No risk

**Cons**:
- Keeps the confusion
- No multi-product-owner support

---

## My Recommendation

I recommend **Option 2: Hybrid Approach**. Here's why:

1. **Database migration is done** - We've already invested the effort
2. **Nothing breaks** - Existing functionality continues to work
3. **Get benefits immediately** - Can start assigning product-specific owners
4. **Low risk** - Backward compatible
5. **Gradual migration** - Can update endpoints one at a time

### What This Means:

**Short term** (next 1-2 hours):
- Add backward-compatible helpers
- Create product permission management API/UI
- Test that existing functionality still works

**Medium term** (over next few weeks):
- Gradually update endpoints to use new permission checks
- Update frontend to show permissions clearly
- Phase out role field references

**Long term** (eventual):
- Remove role field entirely
- All permission checks use new model

---

## Current State

**Database**: ✅ Fully migrated to new permission model
- `users.is_admin` column exists
- `product_permissions` table exists
- Data migrated correctly

**Backend Code**: ⚠️ Still using old role-based checks
- Existing endpoints work
- New permission model not yet integrated

**Frontend**: ⚠️ Still using old role types
- Works with existing backend
- Not aware of new permission model

---

## Next Steps

Please choose one of the following:

1. **Continue with full implementation** - I'll complete all remaining work (~4-6 hours)
2. **Hybrid approach** - I'll add backward compatibility and new features (~1-2 hours)
3. **Pause and test** - Let's test what we have so far, then decide
4. **Rollback** - Revert the migration

Let me know which direction you'd like to go!
