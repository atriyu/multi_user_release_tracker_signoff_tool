import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignStakeholders, getStakeholders, removeStakeholder, getSignOffMatrix } from '@/api/stakeholders';
import type { AssignStakeholdersPayload } from '@/types';

export function useStakeholders(releaseId: number) {
  return useQuery({
    queryKey: ['stakeholders', releaseId],
    queryFn: () => getStakeholders(releaseId),
  });
}

export function useAssignStakeholders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ releaseId, payload }: { releaseId: number; payload: AssignStakeholdersPayload }) =>
      assignStakeholders(releaseId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stakeholders', variables.releaseId] });
      queryClient.invalidateQueries({ queryKey: ['release', variables.releaseId] });
      queryClient.invalidateQueries({ queryKey: ['signOffMatrix', variables.releaseId] });
    },
  });
}

export function useRemoveStakeholder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ releaseId, userId }: { releaseId: number; userId: number }) =>
      removeStakeholder(releaseId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stakeholders', variables.releaseId] });
      queryClient.invalidateQueries({ queryKey: ['release', variables.releaseId] });
      queryClient.invalidateQueries({ queryKey: ['signOffMatrix', variables.releaseId] });
    },
  });
}

export function useSignOffMatrix(releaseId: number) {
  return useQuery({
    queryKey: ['signOffMatrix', releaseId],
    queryFn: () => getSignOffMatrix(releaseId),
  });
}
