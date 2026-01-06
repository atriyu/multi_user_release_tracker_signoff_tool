import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  grantProductPermissions,
  getProductPermissions,
  revokeProductPermission,
} from '@/api/productPermissions';
import type { ProductPermissionCreatePayload } from '@/types';

export function useProductPermissions(productId: number) {
  return useQuery({
    queryKey: ['productPermissions', productId],
    queryFn: () => getProductPermissions(productId),
  });
}

export function useGrantProductPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: number;
      payload: ProductPermissionCreatePayload;
    }) => grantProductPermissions(productId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['productPermissions', variables.productId],
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useRevokeProductPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, userId }: { productId: number; userId: number }) =>
      revokeProductPermission(productId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['productPermissions', variables.productId],
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
