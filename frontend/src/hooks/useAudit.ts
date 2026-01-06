import { useQuery } from '@tanstack/react-query';
import * as api from '@/api';

export function useReleaseHistory(releaseId: number) {
  return useQuery({
    queryKey: ['audit', 'release', releaseId],
    queryFn: () => api.getReleaseHistory(releaseId),
    enabled: !!releaseId,
  });
}

export function useAuditLogs(params?: {
  entity_type?: string;
  entity_id?: number;
  actor_id?: number;
  action?: string;
  skip?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: () => api.queryAuditLogs(params),
  });
}
