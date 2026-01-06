import api from './client';
import type { ReleaseStakeholder, AssignStakeholdersPayload, SignOffMatrix } from '@/types';

export async function assignStakeholders(
  releaseId: number,
  payload: AssignStakeholdersPayload
): Promise<ReleaseStakeholder[]> {
  const { data } = await api.post(`/releases/${releaseId}/stakeholders`, payload);
  return data;
}

export async function getStakeholders(releaseId: number): Promise<ReleaseStakeholder[]> {
  const { data } = await api.get(`/releases/${releaseId}/stakeholders`);
  return data;
}

export async function removeStakeholder(releaseId: number, userId: number): Promise<void> {
  await api.delete(`/releases/${releaseId}/stakeholders/${userId}`);
}

export async function getSignOffMatrix(releaseId: number): Promise<SignOffMatrix> {
  const { data } = await api.get(`/releases/${releaseId}/sign-off-matrix`);
  return data;
}
