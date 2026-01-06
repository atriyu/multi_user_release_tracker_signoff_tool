import { useQuery } from '@tanstack/react-query';
import * as api from '@/api';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: api.getReleasesSummary,
  });
}

export function useMyPendingSignOffs() {
  return useQuery({
    queryKey: ['dashboard', 'pending'],
    queryFn: api.getMyPendingSignOffs,
  });
}
