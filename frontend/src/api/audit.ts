import api from './client';

export interface AuditLogEntry {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  actor_id: number | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  timestamp: string;
}

export async function getReleaseHistory(releaseId: number): Promise<AuditLogEntry[]> {
  const { data } = await api.get(`/releases/${releaseId}/history`);
  return data;
}

export async function queryAuditLogs(params?: {
  entity_type?: string;
  entity_id?: number;
  actor_id?: number;
  action?: string;
  skip?: number;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const { data } = await api.get('/audit', { params });
  return data;
}
