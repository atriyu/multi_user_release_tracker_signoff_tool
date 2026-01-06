import api from './client';
import type { Template, TemplateCriteria } from '@/types';

interface CreateTemplatePayload {
  name: string;
  description?: string;
  is_active?: boolean;
  criteria?: Array<{
    name: string;
    description?: string;
    is_mandatory?: boolean;
    default_owner_id?: number;
    order?: number;
  }>;
}

interface UpdateTemplatePayload {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export async function getTemplates(includeInactive = false): Promise<Template[]> {
  const { data } = await api.get('/templates', {
    params: { include_inactive: includeInactive },
  });
  return data;
}

export async function getTemplate(id: number): Promise<Template> {
  const { data } = await api.get(`/templates/${id}`);
  return data;
}

export async function createTemplate(template: CreateTemplatePayload): Promise<Template> {
  const { data } = await api.post('/templates', template);
  return data;
}

export async function updateTemplate(id: number, template: UpdateTemplatePayload): Promise<Template> {
  const { data } = await api.put(`/templates/${id}`, template);
  return data;
}

export async function deleteTemplate(id: number): Promise<void> {
  await api.delete(`/templates/${id}`);
}

export async function addTemplateCriteria(
  templateId: number,
  criteria: {
    name: string;
    description?: string;
    is_mandatory?: boolean;
    default_owner_id?: number;
    order?: number;
  }
): Promise<TemplateCriteria> {
  const { data } = await api.post(`/templates/${templateId}/criteria`, criteria);
  return data;
}

export async function deleteTemplateCriteria(templateId: number, criteriaId: number): Promise<void> {
  await api.delete(`/templates/${templateId}/criteria/${criteriaId}`);
}
