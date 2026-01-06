import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { useProducts, useCreateProduct, useUpdateProduct, useTemplates } from '@/hooks';
import { ProductOwnerManager } from '@/components/product/ProductOwnerManager';
import { format } from 'date-fns';
import { Plus, FileText } from 'lucide-react';
import type { Product } from '@/types';

export function ProductManager() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const { data: products, isLoading } = useProducts();
  const { data: templates } = useTemplates();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const handleSetDefaultTemplate = (templateId: number | null) => {
    if (!selectedProduct) return;
    updateProduct.mutate(
      { id: selectedProduct.id, data: { default_template_id: templateId } },
      {
        onSuccess: (updatedProduct) => {
          setSelectedProduct(updatedProduct);
        },
      }
    );
  };

  const handleCreate = () => {
    createProduct.mutate(formData, {
      onSuccess: () => {
        setShowCreateModal(false);
        setFormData({ name: '', description: '' });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">
            Manage products and their release criteria templates
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Products List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>All Products</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : products && products.length > 0 ? (
              <div className="space-y-2">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedProduct?.id === product.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium">{product.name}</div>
                    {product.description && (
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {product.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No products yet</p>
            )}
          </CardContent>
        </Card>

        {/* Product Details */}
        <div className="md:col-span-2 space-y-6">
          {selectedProduct ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{selectedProduct.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-muted-foreground">
                      {selectedProduct.description || 'No description'}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Created</h3>
                    <p className="text-muted-foreground">
                      {format(new Date(selectedProduct.created_at), 'PPP')}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium mb-4">Criteria Template Association</h3>
                    {selectedProduct?.default_template_id ? (
                      <div className="border rounded-lg p-4">
                        {templates?.find(t => t.id === selectedProduct.default_template_id) ? (
                          <>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-medium">
                                    {templates.find(t => t.id === selectedProduct.default_template_id)!.name}
                                  </h4>
                                  <Badge variant="outline">Associated</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">
                                  {templates.find(t => t.id === selectedProduct.default_template_id)!.description || 'No description'}
                                </p>
                                <div className="text-sm text-muted-foreground">
                                  {templates.find(t => t.id === selectedProduct.default_template_id)!.criteria.length} sign-off criteria
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button
                                size="sm"
                                onClick={() => setShowTemplateSelector(true)}
                                disabled={updateProduct.isPending}
                              >
                                Edit Criteria Template Association
                              </Button>
                              <Link to={`/templates/${selectedProduct.default_template_id}`}>
                                <Button size="sm" variant="outline">
                                  <FileText className="h-4 w-4 mr-1" />
                                  View Criteria Template
                                </Button>
                              </Link>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground">Criteria template not found</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-lg border-dashed">
                        <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
                        <p className="font-medium mb-4">No criteria template associated</p>
                        {templates && templates.length > 0 ? (
                          <Button
                            size="sm"
                            onClick={() => setShowTemplateSelector(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Select Criteria Template
                          </Button>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No criteria templates available. Visit the <Link to="/templates" className="text-primary hover:underline">Criteria Templates</Link> page to create one.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <ProductOwnerManager productId={selectedProduct.id} />
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Select a Product</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <p>Select a product to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Product Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent onClose={() => setShowCreateModal(false)}>
          <DialogHeader>
            <DialogTitle>Create Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Web Application"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the product..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name.trim() || createProduct.isPending}
            >
              {createProduct.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Selector Modal */}
      <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
        <DialogContent onClose={() => setShowTemplateSelector(false)}>
          <DialogHeader>
            <DialogTitle>Select Criteria Template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Choose a criteria template to associate with this product
            </p>
            {templates && templates.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <button
                  onClick={() => {
                    handleSetDefaultTemplate(null);
                    setShowTemplateSelector(false);
                  }}
                  className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium">No Criteria Template</div>
                    {!selectedProduct?.default_template_id && (
                      <Badge variant="outline">Current</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Remove criteria template association from this product
                  </p>
                </button>
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      handleSetDefaultTemplate(template.id);
                      setShowTemplateSelector(false);
                    }}
                    className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium">{template.name}</div>
                      {selectedProduct?.default_template_id === template.id && (
                        <Badge variant="outline">Current</Badge>
                      )}
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
