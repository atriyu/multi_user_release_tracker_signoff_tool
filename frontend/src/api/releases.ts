import api from './client';
import type { Release, ReleaseDetail, ReleaseStatus, ReleaseCriteria, CriteriaStatus } from '@/types';

interface CreateReleasePayload {
  product_id: number;
  template_id?: number;
  version: string;
  name: string;
  description?: string;
  target_date?: string;
  candidate_build?: string;
}

interface UpdateReleasePayload {
  version?: string;
  name?: string;
  description?: string;
  status?: ReleaseStatus;
  target_date?: string;
  candidate_build?: string;
}

export async function getReleases(params?: {
  product_id?: number;
  status?: ReleaseStatus;
}): Promise<Release[]> {
  const { data } = await api.get('/releases', { params });
  return data;
}

export async function getRelease(id: number): Promise<ReleaseDetail> {
  const { data } = await api.get(`/releases/${id}`);
  return data;
}

export async function createRelease(release: CreateReleasePayload): Promise<ReleaseDetail> {
  const { data } = await api.post('/releases', release);
  return data;
}

export async function updateRelease(id: number, release: UpdateReleasePayload): Promise<Release> {
  const { data } = await api.put(`/releases/${id}`, release);
  return data;
}

export async function deleteRelease(id: number): Promise<void> {
  await api.delete(`/releases/${id}`);
}

export async function addReleaseCriteria(
  releaseId: number,
  criteria: {
    name: string;
    description?: string;
    is_mandatory?: boolean;
    owner_id?: number;
    order?: number;
  }
): Promise<ReleaseCriteria> {
  const { data } = await api.post(`/releases/${releaseId}/criteria`, criteria);
  return data;
}

export async function updateReleaseCriteria(
  releaseId: number,
  criteriaId: number,
  update: {
    name?: string;
    description?: string;
    is_mandatory?: boolean;
    owner_id?: number;
    status?: CriteriaStatus;
    order?: number;
  }
): Promise<ReleaseCriteria> {
  const { data } = await api.put(`/releases/${releaseId}/criteria/${criteriaId}`, update);
  return data;
}

export async function deleteReleaseCriteria(releaseId: number, criteriaId: number): Promise<void> {
  await api.delete(`/releases/${releaseId}/criteria/${criteriaId}`);
}
