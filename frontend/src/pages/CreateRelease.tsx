import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useProducts, useProduct, useTemplates, useCreateRelease } from '@/hooks';
import { FileText, X } from 'lucide-react';

export function CreateRelease() {
  const navigate = useNavigate();
  const [productId, setProductId] = useState<number | ''>('');
  const [templateId, setTemplateId] = useState<number | ''>('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [formData, setFormData] = useState({
    version: '',
    name: '',
    description: '',
    target_date: '',
    candidate_build: '',
  });

  const { data: products } = useProducts();
  const { data: selectedProduct } = useProduct(productId || 0);
  const { data: templates } = useTemplates();
  const createRelease = useCreateRelease();

  // Pre-select product's default template when product changes
  useEffect(() => {
    if (selectedProduct?.default_template_id) {
      setTemplateId(selectedProduct.default_template_id);
    } else {
      setTemplateId('');
    }
  }, [selectedProduct]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;

    createRelease.mutate(
      {
        product_id: productId,
        template_id: templateId || undefined,
        ...formData,
        target_date: formData.target_date || undefined,
        candidate_build: formData.candidate_build || undefined,
      },
      {
        onSuccess: (release) => {
          navigate(`/releases/${release.id}`);
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create Release</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Release Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Product *</label>
              <select
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value ? Number(e.target.value) : '');
                  setTemplateId('');
                }}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Select a product</option>
                {products?.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Template (Optional)</label>
              {templateId && templates?.find(t => t.id === templateId) ? (
                <div className="mt-1 border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {templates.find(t => t.id === templateId)!.name}
                        </span>
                        {selectedProduct?.default_template_id === templateId && (
                          <Badge variant="outline" className="text-xs">Product Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {templates.find(t => t.id === templateId)!.criteria.length} sign-off criteria will be added
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0"
                      onClick={() => setTemplateId('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => setShowTemplateSelector(true)}
                  >
                    Change Criteria Template
                  </Button>
                </div>
              ) : (
                <div className="mt-1">
                  {templates && templates.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowTemplateSelector(true)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Select Criteria Template
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground p-2 border rounded-lg border-dashed">
                      No criteria templates available
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Add sign-off criteria from a template, or leave blank for a custom release
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Version *</label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="e.g., 2.1.0"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Target Date</label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Candidate Build</label>
              <Input
                value={formData.candidate_build}
                onChange={(e) => setFormData({ ...formData, candidate_build: e.target.value })}
                placeholder="e.g., build-2024.01.15-abc123"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Release Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Q1 2024 Release"
                className="mt-1"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this release..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/releases')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createRelease.isPending || !productId}>
                {createRelease.isPending ? 'Creating...' : 'Create Release'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Template Selector Modal */}
      <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
        <DialogContent onClose={() => setShowTemplateSelector(false)}>
          <DialogHeader>
            <DialogTitle>Select Criteria Template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Choose a criteria template to add sign-off criteria to this release
            </p>
            {templates && templates.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <button
                  onClick={() => {
                    setTemplateId('');
                    setShowTemplateSelector(false);
                  }}
                  className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium">No Criteria Template</div>
                    {!templateId && <Badge variant="outline">Current</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Create a blank release without predefined criteria
                  </p>
                </button>
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setTemplateId(template.id);
                      setShowTemplateSelector(false);
                    }}
                    className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium">{template.name}</div>
                      <div className="flex items-center gap-2">
                        {selectedProduct?.default_template_id === template.id && (
                          <Badge variant="secondary" className="text-xs">Product Default</Badge>
                        )}
                        {templateId === template.id && (
                          <Badge variant="outline">Current</Badge>
                        )}
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {template.description}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {template.criteria.length} sign-off criteria • {template.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No criteria templates available
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateSelector(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
