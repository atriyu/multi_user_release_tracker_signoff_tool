import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api';
import type { ReleaseStatus } from '@/types';

export function useReleases(params?: { product_id?: number; status?: ReleaseStatus }) {
  return useQuery({
    queryKey: ['releases', params],
    queryFn: () => api.getReleases(params),
  });
}

export function useRelease(id: number) {
  return useQuery({
    queryKey: ['release', id],
    queryFn: () => api.getRelease(id),
    enabled: !!id,
  });
}

export function useCreateRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createRelease,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
    },
  });
}

export function useUpdateRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof api.updateRelease>[1] }) =>
      api.updateRelease(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      queryClient.invalidateQueries({ queryKey: ['release', id] });
      queryClient.invalidateQueries({ queryKey: ['signOffMatrix', id] });
      queryClient.invalidateQueries({ queryKey: ['audit', 'release', id] });
    },
  });
}

export function useDeleteRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteRelease,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
    },
  });
}

export function useAddReleaseCriteria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ releaseId, criteria }: { releaseId: number; criteria: Parameters<typeof api.addReleaseCriteria>[1] }) =>
      api.addReleaseCriteria(releaseId, criteria),
    onSuccess: (_, { releaseId }) => {
      queryClient.invalidateQueries({ queryKey: ['release', releaseId] });
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      queryClient.invalidateQueries({ queryKey: ['signOffMatrix', releaseId] });
      queryClient.invalidateQueries({ queryKey: ['audit', 'release', releaseId] });
    },
  });
}

export function useUpdateReleaseCriteria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ releaseId, criteriaId, update }: {
      releaseId: number;
      criteriaId: number;
      update: Parameters<typeof api.updateReleaseCriteria>[2]
    }) => api.updateReleaseCriteria(releaseId, criteriaId, update),
    onSuccess: (_, { releaseId }) => {
      queryClient.invalidateQueries({ queryKey: ['release', releaseId] });
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      queryClient.invalidateQueries({ queryKey: ['signOffMatrix', releaseId] });
      queryClient.invalidateQueries({ queryKey: ['audit', 'release', releaseId] });
    },
  });
}

export function useDeleteReleaseCriteria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ releaseId, criteriaId }: { releaseId: number; criteriaId: number }) =>
      api.deleteReleaseCriteria(releaseId, criteriaId),
    onSuccess: (_, { releaseId }) => {
      queryClient.invalidateQueries({ queryKey: ['release', releaseId] });
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      queryClient.invalidateQueries({ queryKey: ['signOffMatrix', releaseId] });
      queryClient.invalidateQueries({ queryKey: ['audit', 'release', releaseId] });
    },
  });
}
