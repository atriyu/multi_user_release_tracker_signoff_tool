import api from './client';
import type { User, UserCreatePayload, UserUpdatePayload } from '@/types';

export async function getUsers(activeOnly = true): Promise<User[]> {
  const { data } = await api.get('/users', { params: { active_only: activeOnly } });
  return data;
}

export async function getUser(id: number): Promise<User> {
  const { data } = await api.get(`/users/${id}`);
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await api.get('/users/me');
  return data;
}

export async function createUser(user: UserCreatePayload): Promise<User> {
  const { data } = await api.post('/users', user);
  return data;
}

export async function updateUser(id: number, user: UserUpdatePayload): Promise<User> {
  const { data } = await api.put(`/users/${id}`, user);
  return data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`);
}
