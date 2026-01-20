import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useAddTemplateCriteria,
  useDeleteTemplateCriteria,
  useUsers,
} from '@/hooks';
import { ArrowLeft, Plus, Trash2, GripVertical, CheckSquare } from 'lucide-react';

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

export function TemplateEditor() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const id = Number(templateId);

  const { data: template, isLoading } = useTemplate(id);
  useUsers(); // Preload users for potential future use
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const addCriteria = useAddTemplateCriteria();
  const deleteCriteria = useDeleteTemplateCriteria();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [localCriteria, setLocalCriteria] = useState<Array<{
    id?: number;
    name: string;
    description: string;
    is_mandatory: boolean;
    order: number;
    _deleted?: boolean;
  }>>([]);
  const [showAddCriteria, setShowAddCriteria] = useState(false);
  const [showPredefinedCriteria, setShowPredefinedCriteria] = useState(false);
  const [selectedPredefinedIndices, setSelectedPredefinedIndices] = useState<Set<number>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [newCriteria, setNewCriteria] = useState({
    name: '',
    description: '',
    is_mandatory: true,
    default_owner_id: '' as number | '',
  });

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setIsActive(template.is_active);
      setLocalCriteria(
        template.criteria.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description || '',
          is_mandatory: c.is_mandatory,
          order: c.order,
        }))
      );
    }
  }, [template]);

  // Track changes to detect unsaved edits
  useEffect(() => {
    if (template) {
      const hasTemplateChanges =
        name !== template.name ||
        (description || '') !== (template.description || '') ||
        isActive !== template.is_active;

      // Check if criteria changed
      const originalCriteria = template.criteria.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        is_mandatory: c.is_mandatory,
        order: c.order,
      }));

      const hasCriteriaChanges =
        localCriteria.length !== originalCriteria.length ||
        localCriteria.some((lc) => {
          const oc = originalCriteria.find(o => o.id === lc.id);
          if (!oc && !lc._deleted) return true; // New criteria
          if (lc._deleted) return true; // Deleted criteria
          return (
            oc &&
            (lc.name !== oc.name ||
              lc.description !== oc.description ||
              lc.is_mandatory !== oc.is_mandatory ||
              lc.order !== oc.order)
          );
        });

      const hasChanges = hasTemplateChanges || hasCriteriaChanges;
      setHasUnsavedChanges(hasChanges);
      if (hasChanges) {
        setJustSaved(false);
      }
    }
  }, [name, description, isActive, localCriteria, template]);

  const handleSave = async () => {
    try {
      // Save template details
      await updateTemplate.mutateAsync({
        id,
        data: { name, description: description || undefined, is_active: isActive },
      });

      // Handle criteria changes
      if (template) {
        // Delete removed criteria
        for (const origCriteria of template.criteria) {
          const stillExists = localCriteria.some(lc => lc.id === origCriteria.id && !lc._deleted);
          if (!stillExists) {
            console.log('Deleting criteria:', origCriteria.id, origCriteria.name);
            await deleteCriteria.mutateAsync({ templateId: id, criteriaId: origCriteria.id });
          }
        }

        // Add new criteria
        for (const lc of localCriteria) {
          if (!lc.id && !lc._deleted) {
            console.log('Adding criteria:', lc.name);
            await addCriteria.mutateAsync({
              templateId: id,
              data: {
                name: lc.name,
                description: lc.description,
                is_mandatory: lc.is_mandatory,
                order: lc.order,
              },
            });
          }
        }
      }

      setHasUnsavedChanges(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch (error) {
      console.error('Error saving template:', error);
      alert(`Failed to save template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddCriteria = () => {
    const maxOrder = Math.max(0, ...localCriteria.map(c => c.order));
    setLocalCriteria([
      ...localCriteria,
      {
        name: newCriteria.name,
        description: newCriteria.description,
        is_mandatory: newCriteria.is_mandatory,
        order: maxOrder + 1,
      },
    ]);
    setShowAddCriteria(false);
    setNewCriteria({
      name: '',
      description: '',
      is_mandatory: true,
      default_owner_id: '',
    });
  };

  const handleDeleteCriteria = (criteriaId?: number) => {
    if (criteriaId) {
      // Mark existing criteria for deletion
      setLocalCriteria(localCriteria.filter(c => c.id !== criteriaId));
    } else {
      // Remove newly added criteria (no id yet)
      setLocalCriteria(localCriteria.slice(0, -1));
    }
  };

  const handleTogglePredefined = (index: number) => {
    const newSelected = new Set(selectedPredefinedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPredefinedIndices(newSelected);
  };

  const handleAddSelectedPredefined = () => {
    const selectedCriteria = Array.from(selectedPredefinedIndices)
      .map(index => availablePredefinedCriteria[index])
      .filter(Boolean);

    const maxOrder = Math.max(0, ...localCriteria.map(c => c.order));
    const newCriteria = selectedCriteria.map((predefined, idx) => ({
      name: predefined.name,
      description: predefined.description,
      is_mandatory: predefined.is_mandatory,
      order: maxOrder + idx + 1,
    }));

    setLocalCriteria([...localCriteria, ...newCriteria]);
    setSelectedPredefinedIndices(new Set());
    setShowPredefinedCriteria(false);
  };

  const handleDeleteTemplate = () => {
    if (confirm(`Are you sure you want to delete the template "${template?.name}"? This action cannot be undone.`)) {
      deleteTemplate.mutate(id, {
        onSuccess: () => {
          navigate('/templates');
        },
      });
    }
  };

  // Get predefined criteria that are not already in the local criteria
  const availablePredefinedCriteria = PREDEFINED_CRITERIA.filter(
    (predefined) => !localCriteria.some((c) => c.name === predefined.name && !c._deleted)
  );

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Criteria template not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const sortedCriteria = [...localCriteria].filter(c => !c._deleted).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link
          to="/templates"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Criteria Templates
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Edit Sign-off Criteria Template</h1>
            <p className="text-muted-foreground mt-1">
              Define reusable sign-off criteria for your releases
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={updateTemplate.isPending || !hasUnsavedChanges}
            variant={justSaved ? 'outline' : 'default'}
          >
            {updateTemplate.isPending
              ? 'Saving...'
              : justSaved
              ? 'Changes Saved'
              : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Template Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Criteria Template Details</CardTitle>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteTemplate}
              disabled={deleteTemplate.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {deleteTemplate.isPending ? 'Deleting...' : 'Delete Criteria Template'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Criteria template name"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Criteria template description..."
              className="mt-1"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-input"
            />
            <label htmlFor="is-active" className="text-sm">
              Active (available for new releases)
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Criteria */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sign-off Criteria</CardTitle>
            <div className="flex gap-2">
              {availablePredefinedCriteria.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setShowPredefinedCriteria(true)}
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Add Predefined
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setShowAddCriteria(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Custom
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedCriteria.length > 0 ? (
            <div className="space-y-3">
              {sortedCriteria.map((criteria) => (
                <div
                  key={criteria.id}
                  className="flex items-start gap-3 p-4 border rounded-lg"
                >
                  <div className="text-muted-foreground cursor-move">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{criteria.name}</span>
                      {criteria.is_mandatory ? (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Optional
                        </Badge>
                      )}
                    </div>
                    {criteria.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {criteria.description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteCriteria(criteria.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No criteria defined yet</p>
              <p className="text-sm">Add criteria that need to be signed off for releases</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Predefined Criteria Modal */}
      <Dialog open={showPredefinedCriteria} onOpenChange={setShowPredefinedCriteria}>
        <DialogContent onClose={() => {
          setShowPredefinedCriteria(false);
          setSelectedPredefinedIndices(new Set());
        }}>
          <DialogHeader>
            <DialogTitle>Add Predefined Criteria</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select one or more standard sign-off criteria
            </p>
            {availablePredefinedCriteria.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availablePredefinedCriteria.map((predefined, index) => (
                  <label
                    key={index}
                    className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPredefinedIndices.has(index)}
                      onChange={() => handleTogglePredefined(index)}
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{predefined.name}</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {predefined.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                All predefined criteria have been added
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPredefinedCriteria(false);
              setSelectedPredefinedIndices(new Set());
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSelectedPredefined}
              disabled={selectedPredefinedIndices.size === 0}
            >
              Add Selected ({selectedPredefinedIndices.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Criteria Modal */}
      <Dialog open={showAddCriteria} onOpenChange={setShowAddCriteria}>
        <DialogContent onClose={() => setShowAddCriteria(false)}>
          <DialogHeader>
            <DialogTitle>Add Custom Criteria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={newCriteria.name}
                onChange={(e) =>
                  setNewCriteria({ ...newCriteria, name: e.target.value })
                }
                placeholder="e.g., Security Review"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newCriteria.description}
                onChange={(e) =>
                  setNewCriteria({ ...newCriteria, description: e.target.value })
                }
                placeholder="What needs to be checked..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-mandatory"
                checked={newCriteria.is_mandatory}
                onChange={(e) =>
                  setNewCriteria({ ...newCriteria, is_mandatory: e.target.checked })
                }
                className="rounded border-input"
              />
              <label htmlFor="is-mandatory" className="text-sm">
                Required for release approval
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCriteria(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCriteria}
              disabled={!newCriteria.name.trim()}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
