import api from './client';
import type { SignOff, SignOffStatus } from '@/types';

export async function createSignOff(
  criteriaId: number,
  signOff: { status: SignOffStatus; comment?: string; link?: string }
): Promise<SignOff> {
  const { data } = await api.post(`/criteria/${criteriaId}/sign-off`, signOff);
  return data;
}

export async function revokeSignOff(criteriaId: number): Promise<void> {
  await api.delete(`/criteria/${criteriaId}/sign-off`);
}

export async function getReleaseSignOffs(releaseId: number): Promise<SignOff[]> {
  const { data } = await api.get(`/releases/${releaseId}/sign-offs`);
  return data;
}
