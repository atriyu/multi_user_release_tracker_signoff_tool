import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { useUsers, useCreateUser, useDeleteUser, useProducts } from '@/hooks';
import { format } from 'date-fns';
import { ArrowLeft, Plus, UserX, Package } from 'lucide-react';

// Component to display user's product owner permissions
function UserProductList({ userId }: { userId: number }) {
  const { data: products } = useProducts();

  // Filter products where this user has product owner permission
  const userProducts = products?.filter(product =>
    product.product_owners?.some(po => po.user_id === userId)
  ) || [];

  if (userProducts.length === 0) {
    return <span className="text-xs text-muted-foreground">None</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {userProducts.map((product) => (
        <Badge key={product.id} variant="outline" className="text-xs">
          <Package className="h-3 w-3 mr-1" />
          {product.name}
        </Badge>
      ))}
    </div>
  );
}

export function UserManager() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [formData, setFormData] = useState<{ name: string; email: string; is_admin: boolean }>({
    name: '',
    email: '',
    is_admin: false
  });

  const { data: users, isLoading } = useUsers(!showInactive);
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  const handleCreate = () => {
    createUser.mutate(formData, {
      onSuccess: () => {
        setShowCreateModal(false);
        setFormData({ name: '', email: '', is_admin: false });
      },
    });
  };

  const handleDeactivate = (userId: number, userName: string) => {
    if (confirm(`Are you sure you want to deactivate ${userName}?`)) {
      deleteUser.mutate(userId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/settings"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Settings
          </Link>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage users who can sign off on releases
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Users</CardTitle>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-input"
              />
              Show inactive users
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Product Owner For</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.is_admin ? (
                        <Badge variant="destructive">System Admin</Badge>
                      ) : (
                        <Badge variant="secondary">User</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_admin ? (
                        <span className="text-xs text-muted-foreground">All products</span>
                      ) : (
                        <UserProductList userId={user.id} />
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {user.is_active && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeactivate(user.id, user.name)}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">No users found</p>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent onClose={() => setShowCreateModal(false)}>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@company.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  className="rounded border-input"
                />
                <span className="text-sm font-medium">System Administrator</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                System administrators have full access to all products and releases.
                Product owner permissions are managed per-product in the Products page.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !formData.name.trim() || !formData.email.trim() || createUser.isPending
              }
            >
              {createUser.isPending ? 'Adding...' : 'Add User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
