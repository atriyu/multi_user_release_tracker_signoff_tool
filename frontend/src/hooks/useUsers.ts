import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api';

export function useUsers(activeOnly = true) {
  return useQuery({
    queryKey: ['users', { activeOnly }],
    queryFn: () => api.getUsers(activeOnly),
  });
}

export function useCurrentUser() {
  const userId = localStorage.getItem('currentUserId');
  return useQuery({
    queryKey: ['currentUser', userId],
    queryFn: api.getCurrentUser,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => api.getUser(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof api.updateUser>[1] }) =>
      api.updateUser(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', id] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
