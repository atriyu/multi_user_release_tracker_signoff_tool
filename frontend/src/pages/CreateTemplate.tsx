import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCreateTemplate, useUsers } from '@/hooks';
import { ArrowLeft, Plus, Trash2, CheckSquare, ChevronUp } from 'lucide-react';

interface CriteriaItem {
  name: string;
  description: string;
  is_mandatory: boolean;
  default_owner_id: number | undefined;
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

export function CreateTemplate() {
  const navigate = useNavigate();

  useUsers(); // Preload users for potential future use
  const createTemplate = useCreateTemplate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState<CriteriaItem[]>([]);
  const [selectedPredefined, setSelectedPredefined] = useState<Set<number>>(new Set());
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [newCriteria, setNewCriteria] = useState<CriteriaItem>({
    name: '',
    description: '',
    is_mandatory: true,
    default_owner_id: undefined,
  });

  const handleAddCriteria = () => {
    if (!newCriteria.name.trim()) return;
    setCriteria([...criteria, { ...newCriteria }]);
    setNewCriteria({
      name: '',
      description: '',
      is_mandatory: true,
      default_owner_id: undefined,
    });
    setShowCustomForm(false);
  };

  const handleRemoveCriteria = (index: number) => {
    const criteriaToRemove = criteria[index];
    setCriteria(criteria.filter((_, i) => i !== index));

    // If it was a predefined criteria, uncheck it
    const predefinedIndex = PREDEFINED_CRITERIA.findIndex(p => p.name === criteriaToRemove.name);
    if (predefinedIndex !== -1 && selectedPredefined.has(predefinedIndex)) {
      const newSelected = new Set(selectedPredefined);
      newSelected.delete(predefinedIndex);
      setSelectedPredefined(newSelected);
    }
  };

  const handleTogglePredefined = (index: number) => {
    const newSelected = new Set(selectedPredefined);
    if (newSelected.has(index)) {
      newSelected.delete(index);
      // Remove from criteria list
      const predefinedCriteria = PREDEFINED_CRITERIA[index];
      setCriteria(criteria.filter(c => c.name !== predefinedCriteria.name));
    } else {
      newSelected.add(index);
      // Add to criteria list
      const predefinedCriteria = PREDEFINED_CRITERIA[index];
      setCriteria([...criteria, {
        ...predefinedCriteria,
        default_owner_id: undefined,
      }]);
    }
    setSelectedPredefined(newSelected);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTemplate.mutate(
      {
        name,
        description: description || undefined,
        criteria: criteria.map((c, i) => ({
          ...c,
          order: i + 1,
        })),
      },
      {
        onSuccess: (template) => {
          navigate(`/templates/${template.id}`);
        },
      }
    );
  };

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
        <h1 className="text-3xl font-bold">Create Sign-off Criteria Template</h1>
        <p className="text-muted-foreground mt-1">
          Define reusable sign-off criteria for your releases
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Criteria Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Standard Release"
                className="mt-1"
                required
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
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sign-off Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Predefined criteria selection */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckSquare className="h-5 w-5 text-primary" />
                <h4 className="font-medium">Select from Predefined Criteria</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Choose standard sign-off criteria for consistency across templates
              </p>
              <div className="space-y-2">
                {PREDEFINED_CRITERIA.map((predefined, index) => (
                  <label
                    key={index}
                    className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPredefined.has(index)}
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
            </div>

            {/* Selected criteria summary */}
            {criteria.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium mb-3">Selected Criteria ({criteria.length})</h4>
                <div className="space-y-2">
                  {criteria.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {item.is_mandatory ? (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Optional
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive shrink-0 ml-2"
                        onClick={() => handleRemoveCriteria(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom criteria toggle/form */}
            <div className="mt-6">
              {!showCustomForm ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCustomForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Criteria
                </Button>
              ) : (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Add Custom Criteria</h4>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowCustomForm(false)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create your own custom sign-off criteria
                  </p>
                  <div className="space-y-3">
                    <Input
                      value={newCriteria.name}
                      onChange={(e) =>
                        setNewCriteria({ ...newCriteria, name: e.target.value })
                      }
                      placeholder="Criteria name"
                    />
                    <Input
                      value={newCriteria.description}
                      onChange={(e) =>
                        setNewCriteria({ ...newCriteria, description: e.target.value })
                      }
                      placeholder="Description (optional)"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={newCriteria.is_mandatory}
                          onChange={(e) =>
                            setNewCriteria({
                              ...newCriteria,
                              is_mandatory: e.target.checked,
                            })
                          }
                          className="rounded border-input"
                        />
                        Required for approval
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddCriteria}
                        disabled={!newCriteria.name.trim()}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/templates')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim() || createTemplate.isPending}>
            {createTemplate.isPending ? 'Creating...' : 'Create Template'}
          </Button>
        </div>
      </form>
    </div>
  );
}
