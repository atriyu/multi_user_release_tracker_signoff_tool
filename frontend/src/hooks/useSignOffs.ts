import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api';
import type { SignOffStatus } from '@/types';

export function useCreateSignOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      criteriaId,
      status,
      comment,
      link,
    }: {
      criteriaId: number;
      status: SignOffStatus;
      comment?: string;
      link?: string;
    }) => api.createSignOff(criteriaId, { status, comment, link }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['signOffMatrix'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useRevokeSignOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.revokeSignOff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['signOffMatrix'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}
