import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, UserX } from 'lucide-react';
import {
  useProductPermissions,
  useGrantProductPermissions,
  useRevokeProductPermission,
  useUsers,
} from '@/hooks';
import { useAuth } from '@/context/AuthContext';

interface ProductOwnerManagerProps {
  productId: number;
}

export function ProductOwnerManager({ productId }: ProductOwnerManagerProps) {
  const { isAdmin } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const { data: permissions, isLoading: permissionsLoading } = useProductPermissions(productId);
  const { data: allUsers } = useUsers(true);
  const grantPermissions = useGrantProductPermissions();
  const revokePermission = useRevokeProductPermission();

  if (!isAdmin) {
    return null;
  }

  const currentOwnerIds = new Set(permissions?.map((p) => p.user_id) || []);
  const availableUsers = allUsers?.filter((u) => !currentOwnerIds.has(u.id) && !u.is_admin) || [];

  const handleAddOwners = () => {
    if (selectedUserIds.length === 0) return;

    grantPermissions.mutate(
      {
        productId,
        payload: { user_ids: selectedUserIds },
      },
      {
        onSuccess: () => {
          setShowAddModal(false);
          setSelectedUserIds([]);
        },
      }
    );
  };

  const handleRemoveOwner = (userId: number, userName: string) => {
    if (confirm(`Remove ${userName} as product owner?`)) {
      revokePermission.mutate({ productId, userId });
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Product Owners</CardTitle>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Owner
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {permissionsLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : permissions && permissions.length > 0 ? (
            <div className="space-y-2">
              {permissions.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{permission.user?.name}</p>
                    <p className="text-sm text-muted-foreground">{permission.user?.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      handleRemoveOwner(permission.user_id, permission.user?.name || 'User')
                    }
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No product owners assigned. Only system administrators can manage this product.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add Owners Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product Owners</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {availableUsers.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="rounded border-input"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">
                No available users to add. All non-admin users are already product owners.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddOwners}
              disabled={selectedUserIds.length === 0 || grantPermissions.isPending}
            >
              {grantPermissions.isPending
                ? 'Adding...'
                : `Add ${selectedUserIds.length || ''} Owner${selectedUserIds.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
