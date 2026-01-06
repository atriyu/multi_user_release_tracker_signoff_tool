import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useUsers } from '@/hooks';
import { useAssignStakeholders, useRemoveStakeholder } from '@/hooks/useStakeholders';
import { Users, Plus, X } from 'lucide-react';
import type { ReleaseStakeholder } from '@/types';

interface StakeholderAssignmentProps {
  releaseId: number;
  stakeholders: ReleaseStakeholder[];
  canEdit?: boolean;
}

export function StakeholderAssignment({ releaseId, stakeholders, canEdit = false }: StakeholderAssignmentProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const { data: allUsers } = useUsers(true);
  const assignStakeholders = useAssignStakeholders();
  const removeStakeholder = useRemoveStakeholder();

  const stakeholderIds = new Set(stakeholders.map(s => s.user_id));
  const availableUsers = allUsers?.filter(u => !stakeholderIds.has(u.id)) || [];

  const handleAssign = () => {
    if (selectedUserIds.length === 0) return;

    assignStakeholders.mutate(
      { releaseId, payload: { user_ids: selectedUserIds } },
      {
        onSuccess: () => {
          setShowAssignModal(false);
          setSelectedUserIds([]);
        },
      }
    );
  };

  const handleRemove = (userId: number) => {
    if (confirm('Remove this stakeholder? Their sign-offs will be preserved but no longer count.')) {
      removeStakeholder.mutate({ releaseId, userId });
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Stakeholders</CardTitle>
              <Badge variant="secondary">{stakeholders.length}</Badge>
            </div>
            <Button
              onClick={() => setShowAssignModal(true)}
              size="sm"
              disabled={!canEdit}
              title={!canEdit ? 'Only admins and product owners can assign stakeholders' : undefined}
            >
              <Plus className="h-4 w-4 mr-1" />
              Assign Stakeholder
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stakeholders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No stakeholders assigned yet</p>
              <p className="text-sm mt-1">Assign stakeholders to enable sign-offs</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stakeholders.map(stakeholder => (
                <div
                  key={stakeholder.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{stakeholder.user.name}</p>
                    <p className="text-sm text-muted-foreground">{stakeholder.user.email}</p>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(stakeholder.user_id)}
                      disabled={removeStakeholder.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Stakeholders</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {availableUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                All users are already assigned as stakeholders
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableUsers.map(user => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedUserIds.includes(user.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/50'
                    }`}
                    onClick={() => toggleUserSelection(user.id)}
                  >
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedUserIds.includes(user.id)
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/50'
                    }`}>
                      {selectedUserIds.includes(user.id) && (
                        <svg
                          className="w-3 h-3 text-primary-foreground"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignModal(false);
                setSelectedUserIds([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={selectedUserIds.length === 0 || assignStakeholders.isPending}
            >
              Assign {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
