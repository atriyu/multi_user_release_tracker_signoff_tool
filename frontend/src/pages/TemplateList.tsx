import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { useTemplates } from '@/hooks';
import { format } from 'date-fns';
import { Plus, FileText, Edit } from 'lucide-react';

export function TemplateList() {
  const { data: templates, isLoading } = useTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sign-off Criteria Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage reusable sign-off criteria templates for releases
          </p>
        </div>
        <Link to="/templates/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Criteria Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : templates && templates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Criteria Count</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {template.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {template.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {template.criteria.length} {template.criteria.length === 1 ? 'criterion' : 'criteria'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(template.created_at), 'PPP')}
                    </TableCell>
                    <TableCell>
                      <Link to={`/templates/${template.id}`}>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No criteria templates yet</p>
              <p className="text-sm mb-4">
                Create a criteria template to define reusable sign-off criteria for your releases
              </p>
              <Link to="/templates/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Criteria Template
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
