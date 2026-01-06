import { useReleaseHistory } from '@/hooks';
import { format } from 'date-fns';
import { CheckCircle, XCircle, RotateCcw, Edit, Plus, Trash2 } from 'lucide-react';
import type { AuditLogEntry } from '@/api/audit';

interface AuditTimelineProps {
  releaseId: number;
}

function getActionIcon(action: string) {
  switch (action) {
    case 'create':
      return <Plus className="h-4 w-4 text-green-500" />;
    case 'update':
      return <Edit className="h-4 w-4 text-blue-500" />;
    case 'delete':
      return <Trash2 className="h-4 w-4 text-red-500" />;
    case 'sign_off':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'reject':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'revoke':
      return <RotateCcw className="h-4 w-4 text-yellow-500" />;
    default:
      return <Edit className="h-4 w-4 text-gray-500" />;
  }
}

function getActionDescription(entry: AuditLogEntry): string {
  const { entity_type, action, new_value } = entry;

  if (entity_type === 'release') {
    if (action === 'create') return 'Release created';
    if (action === 'update') {
      if (new_value?.status) return `Status changed to ${new_value.status}`;
      return 'Release updated';
    }
  }

  if (entity_type === 'release_criteria') {
    if (action === 'create') return `Criteria "${new_value?.name || 'unknown'}" added`;
    if (action === 'update') return `Criteria updated`;
  }

  if (entity_type === 'sign_off') {
    const status = new_value?.status;
    if (status === 'approved') return `Criteria approved`;
    if (status === 'rejected') return `Criteria rejected`;
    if (status === 'revoked') return `Sign-off revoked`;
  }

  return `${entity_type} ${action}`;
}

export function AuditTimeline({ releaseId }: AuditTimelineProps) {
  const { data: history, isLoading } = useReleaseHistory(releaseId);

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading history...</p>;
  }

  if (!history || history.length === 0) {
    return <p className="text-muted-foreground text-sm">No activity recorded yet</p>;
  }

  return (
    <div className="space-y-4">
      {history.slice(0, 10).map((entry, index) => (
        <div key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="p-1.5 rounded-full bg-muted">
              {getActionIcon(entry.action)}
            </div>
            {index < history.length - 1 && (
              <div className="w-px h-full bg-border mt-2" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm font-medium">{getActionDescription(entry)}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm')}</span>
              {entry.actor_id && <span>by User #{entry.actor_id}</span>}
            </div>
            {entry.new_value?.comment && (
              <p className="text-sm text-muted-foreground mt-1 italic">
                "{entry.new_value.comment}"
              </p>
            )}
            {entry.new_value?.link && (
              <a
                href={entry.new_value.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline mt-1 inline-block"
              >
                View test results →
              </a>
            )}
          </div>
        </div>
      ))}
      {history.length > 10 && (
        <p className="text-sm text-muted-foreground text-center">
          +{history.length - 10} more entries
        </p>
      )}
    </div>
  );
}
