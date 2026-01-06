import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { useAuditLogs } from '@/hooks';
import { format } from 'date-fns';
import { ArrowLeft, Search, ChevronDown, ChevronRight } from 'lucide-react';
import type { AuditLogEntry } from '@/api/audit';

const actionColors: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  create: 'success',
  update: 'warning',
  delete: 'destructive',
  sign_off: 'default',
};

function AuditEntryRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <TableCell>
          <button className="text-muted-foreground">
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </TableCell>
        <TableCell>
          {format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm:ss')}
        </TableCell>
        <TableCell>
          <Badge variant={actionColors[entry.action] || 'secondary'}>
            {entry.action}
          </Badge>
        </TableCell>
        <TableCell className="font-medium">{entry.entity_type}</TableCell>
        <TableCell>#{entry.entity_id}</TableCell>
        <TableCell className="text-muted-foreground">
          {entry.actor_id ? `User #${entry.actor_id}` : 'System'}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30">
            <div className="p-4 space-y-4">
              {entry.old_value && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Previous Value</h4>
                  <pre className="text-xs bg-background p-3 rounded border overflow-auto">
                    {JSON.stringify(entry.old_value, null, 2)}
                  </pre>
                </div>
              )}
              {entry.new_value && (
                <div>
                  <h4 className="text-sm font-medium mb-2">New Value</h4>
                  <pre className="text-xs bg-background p-3 rounded border overflow-auto">
                    {JSON.stringify(entry.new_value, null, 2)}
                  </pre>
                </div>
              )}
              {!entry.old_value && !entry.new_value && (
                <p className="text-sm text-muted-foreground">No additional details</p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function AuditLog() {
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [action, setAction] = useState('');

  const { data: logs, isLoading, refetch } = useAuditLogs({
    entity_type: entityType || undefined,
    entity_id: entityId ? Number(entityId) : undefined,
    action: action || undefined,
    limit: 100,
  });

  const entityTypes = ['release', 'release_criteria', 'sign_off', 'product', 'template'];
  const actions = ['create', 'update', 'delete', 'sign_off', 'revoke'];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/settings"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground mt-1">
          Track all changes and actions in the system
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-1 block">Entity Type</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All types</option>
                {entityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-1 block">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All actions</option>
                {actions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-1 block">Entity ID</label>
              <Input
                type="number"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="e.g., 123"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => refetch()}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            Audit Entries
            {logs && <span className="text-muted-foreground font-normal ml-2">({logs.length})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((entry) => (
                  <AuditEntryRow key={entry.id} entry={entry} />
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No audit entries found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
