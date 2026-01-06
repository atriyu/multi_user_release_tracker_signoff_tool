import api from './client';
import type { DashboardSummary, PendingSignOff } from '@/types';

export async function getMyPendingSignOffs(): Promise<PendingSignOff[]> {
  const { data } = await api.get('/dashboard/my-pending');
  return data;
}

export async function getReleasesSummary(): Promise<DashboardSummary> {
  const { data } = await api.get('/dashboard/releases-summary');
  return data;
}
