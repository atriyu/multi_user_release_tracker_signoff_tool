import { Badge } from '@/components/ui/badge';
import type { ReleaseStatus, CriteriaStatus } from '@/types';

const releaseStatusConfig: Record<ReleaseStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  in_review: { label: 'In Review', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  released: { label: 'Released', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

const criteriaStatusConfig: Record<CriteriaStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  blocked: { label: 'Blocked', variant: 'warning' },
};

interface StatusBadgeProps {
  status: ReleaseStatus | CriteriaStatus;
  type?: 'release' | 'criteria';
}

export function StatusBadge({ status, type = 'release' }: StatusBadgeProps) {
  const config = type === 'release'
    ? releaseStatusConfig[status as ReleaseStatus]
    : criteriaStatusConfig[status as CriteriaStatus];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
