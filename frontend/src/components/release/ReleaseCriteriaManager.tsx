import { useState } from 'react';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAddReleaseCriteria, useUpdateReleaseCriteria, useDeleteReleaseCriteria } from '@/hooks';
import type { ReleaseCriteria, ReleaseStatus } from '@/types';

interface ReleaseCriteriaManagerProps {
  releaseId: number;
  releaseStatus: ReleaseStatus;
  criteria: ReleaseCriteria[];
  canEdit: boolean; // Admin or Product Owner
}

interface CriteriaFormData {
  name: string;
  description: string;
  is_mandatory: boolean;
}

// Predefined sign-off criteria library (in canonical order)
const PREDEFINED_CRITERIA = [
  {
    name: 'Content Review',
    description: 'Review and approval of content changes',
    is_mandatory: true,
  },
  {
    name: 'Bug Verification',
    description: 'Verification that all bugs are fixed. Provide Jira link',
    is_mandatory: true,
  },
  {
    name: 'Smoke & Extended Smoke Regression',
    description: 'Smoke and extended smoke regression testing. Provide test results link',
    is_mandatory: true,
  },
  {
    name: 'Full Regression',
    description: 'Complete regression testing. Provide test results link',
    is_mandatory: true,
  },
  {
    name: 'CPT Sign-off',
    description: 'Cross-Platform Testing sign-off',
    is_mandatory: true,
  },
  {
    name: 'Pre-Prod Monitoring incl. Crash Analysis',
    description: 'Pre-production monitoring and crash analysis review',
    is_mandatory: true,
  },
  {
    name: 'Production Monitoring',
    description: 'Production monitoring verification',
    is_mandatory: true,
  },
  {
    name: 'Security Audit',
    description: 'Security review and vulnerability assessment',
    is_mandatory: true,
  },
];

export function ReleaseCriteriaManager({
  releaseId,
  releaseStatus,
  criteria,
  canEdit,
}: ReleaseCriteriaManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<ReleaseCriteria | null>(null);
  const [useCustomCriteria, setUseCustomCriteria] = useState(false);
  const [selectedPredefined, setSelectedPredefined] = useState<string>('');
  const [formData, setFormData] = useState<CriteriaFormData>({
    name: '',
    description: '',
    is_mandatory: true,
  });

  const addCriteria = useAddReleaseCriteria();
  const updateCriteria = useUpdateReleaseCriteria();
  const deleteCriteria = useDeleteReleaseCriteria();

  // Can only modify in Draft or In Review status
  const canModify = canEdit && (releaseStatus === 'draft' || releaseStatus === 'in_review');

  // Filter out predefined criteria that already exist
  const existingCriteriaNames = new Set(criteria.map(c => c.name.toLowerCase().trim()));
  const availablePredefinedCriteria = PREDEFINED_CRITERIA.filter(
    pc => !existingCriteriaNames.has(pc.name.toLowerCase().trim())
  );

  const handleOpenAddDialog = () => {
    setShowAddDialog(true);
    setUseCustomCriteria(false);
    setSelectedPredefined('');
    setFormData({ name: '', description: '', is_mandatory: true });
  };

  const handlePredefinedSelect = (criteriaName: string) => {
    setSelectedPredefined(criteriaName);
    const predefined = PREDEFINED_CRITERIA.find(c => c.name === criteriaName);
    if (predefined) {
      setFormData({
        name: predefined.name,
        description: predefined.description,
        is_mandatory: predefined.is_mandatory,
      });
    }
  };

  const handleAdd = () => {
    // Check if criteria with same name already exists
    const isDuplicate = criteria.some(
      c => c.name.toLowerCase().trim() === formData.name.toLowerCase().trim()
    );

    if (isDuplicate) {
      alert(`A criteria named "${formData.name}" already exists for this release. Please use a different name.`);
      return;
    }

    addCriteria.mutate(
      {
        releaseId,
        criteria: {
          name: formData.name,
          description: formData.description,
          is_mandatory: formData.is_mandatory,
          order: criteria.length + 1,
        },
      },
      {
        onSuccess: () => {
          setShowAddDialog(false);
          setUseCustomCriteria(false);
          setSelectedPredefined('');
          setFormData({ name: '', description: '', is_mandatory: true });
        },
      }
    );
  };

  const handleEditClick = (criterion: ReleaseCriteria) => {
    setEditingCriteria(criterion);
    setFormData({
      name: criterion.name,
      description: criterion.description || '',
      is_mandatory: criterion.is_mandatory,
    });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!editingCriteria) return;

    updateCriteria.mutate(
      {
        releaseId,
        criteriaId: editingCriteria.id,
        update: {
          name: formData.name,
          description: formData.description,
          is_mandatory: formData.is_mandatory,
        },
      },
      {
        onSuccess: () => {
          setShowEditDialog(false);
          setEditingCriteria(null);
          setFormData({ name: '', description: '', is_mandatory: true });
        },
      }
    );
  };

  const handleDelete = (criterion: ReleaseCriteria) => {
    // Check if criteria has sign-offs
    const hasSignOffs = criterion.sign_offs && criterion.sign_offs.length > 0;

    if (hasSignOffs) {
      alert('Cannot delete criteria with existing sign-offs. This preserves the audit trail.');
      return;
    }

    if (confirm(`Are you sure you want to delete "${criterion.name}"? This action cannot be undone.`)) {
      deleteCriteria.mutate({ releaseId, criteriaId: criterion.id });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Sign-Off Criteria</CardTitle>
          {canModify && (
            <Button size="sm" onClick={handleOpenAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Criteria
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {criteria.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No criteria defined. {canModify && 'Click "Add Criteria" to get started.'}
          </p>
        ) : (
          <div className="space-y-3">
            {criteria.map((criterion) => {
              // Filter out revoked sign-offs for accurate count
              const activeSignOffs = criterion.sign_offs?.filter(s => s.status !== 'revoked') || [];
              const hasSignOffs = activeSignOffs.length > 0;

              return (
                <div
                  key={criterion.id}
                  className="border rounded-lg p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{criterion.name}</h4>
                      <Badge variant={criterion.is_mandatory ? 'destructive' : 'secondary'}>
                        {criterion.is_mandatory ? 'Mandatory' : 'Optional'}
                      </Badge>
                      {hasSignOffs && (
                        <Badge variant="outline">{activeSignOffs.length} sign-off(s)</Badge>
                      )}
                    </div>
                    {criterion.description && (
                      <p className="text-sm text-muted-foreground">{criterion.description}</p>
                    )}
                  </div>

                  {canModify && (
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditClick(criterion)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(criterion)}
                        disabled={hasSignOffs}
                        title={hasSignOffs ? 'Cannot delete criteria with sign-offs' : 'Delete criteria'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add Criteria Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sign-Off Criteria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Toggle between predefined and custom */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!useCustomCriteria ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setUseCustomCriteria(false);
                  if (selectedPredefined) {
                    handlePredefinedSelect(selectedPredefined);
                  } else {
                    setFormData({ name: '', description: '', is_mandatory: true });
                  }
                }}
                className="flex-1"
              >
                Predefined
              </Button>
              <Button
                type="button"
                variant={useCustomCriteria ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setUseCustomCriteria(true);
                  setSelectedPredefined('');
                  setFormData({ name: '', description: '', is_mandatory: true });
                }}
                className="flex-1"
              >
                Custom
              </Button>
            </div>

            {/* Predefined criteria dropdown */}
            {!useCustomCriteria && (
              <div>
                <label className="text-sm font-medium">Select Criteria *</label>
                <select
                  value={selectedPredefined}
                  onChange={(e) => handlePredefinedSelect(e.target.value)}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- Select a predefined criteria --</option>
                  {availablePredefinedCriteria.length === 0 ? (
                    <option value="" disabled>All predefined criteria have been added</option>
                  ) : (
                    availablePredefinedCriteria.map((criteria) => (
                      <option key={criteria.name} value={criteria.name}>
                        {criteria.name}
                      </option>
                    ))
                  )}
                </select>
                {availablePredefinedCriteria.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    All predefined criteria have been added. Switch to "Custom" to add a new criteria.
                  </p>
                )}
              </div>
            )}

            {/* Custom criteria fields or editable predefined */}
            {(useCustomCriteria || selectedPredefined) && (
              <>
                <div>
                  <label className="text-sm font-medium">Criteria Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Security Review"
                    className="mt-1"
                    disabled={!useCustomCriteria && selectedPredefined !== ''}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of what needs to be verified"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_mandatory}
                      onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                      className="rounded border-input"
                    />
                    <span className="text-sm font-medium">Required for approval</span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    If checked, all stakeholders must approve this criteria for the release to be approved
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!formData.name.trim() || addCriteria.isPending}
            >
              {addCriteria.isPending ? 'Adding...' : 'Add Criteria'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Criteria Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Criteria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Criteria Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Security Review"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of what needs to be verified"
                className="mt-1"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_mandatory}
                  onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                  className="rounded border-input"
                />
                <span className="text-sm font-medium">Required for approval</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                If checked, all stakeholders must approve this criteria for the release to be approved
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.name.trim() || updateCriteria.isPending}
            >
              {updateCriteria.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
