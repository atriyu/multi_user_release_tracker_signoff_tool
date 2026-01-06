import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/userPermissions';

export function useProductOwnerStatus(userId: number) {
  return useQuery({
    queryKey: ['productOwnerStatus', userId],
    queryFn: () => api.checkProductOwnerStatus(userId),
    enabled: !!userId,
  });
}

export function useGrantProductOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.grantProductOwnerPermission,
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['productOwnerStatus', userId] });
    },
  });
}

export function useRevokeProductOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.revokeProductOwnerPermission,
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['productOwnerStatus', userId] });
    },
  });
}
