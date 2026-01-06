import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api';

export function useTemplates(includeInactive = false) {
  return useQuery({
    queryKey: ['templates', { includeInactive }],
    queryFn: () => api.getTemplates(includeInactive),
  });
}

export function useTemplate(id: number) {
  return useQuery({
    queryKey: ['template', id],
    queryFn: () => api.getTemplate(id),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof api.createTemplate>[0]) => api.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof api.updateTemplate>[1] }) =>
      api.updateTemplate(id, data),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', template.id] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useAddTemplateCriteria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: number;
      data: Parameters<typeof api.addTemplateCriteria>[1];
    }) => api.addTemplateCriteria(templateId, data),
    onSuccess: (criteria) => {
      queryClient.invalidateQueries({ queryKey: ['template', criteria.template_id] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useDeleteTemplateCriteria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, criteriaId }: { templateId: number; criteriaId: number }) =>
      api.deleteTemplateCriteria(templateId, criteriaId),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}
