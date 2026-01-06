import api from './client';

export async function grantProductOwnerPermission(userId: number): Promise<void> {
  await api.post(`/users/${userId}/grant-product-owner`);
}

export async function revokeProductOwnerPermission(userId: number): Promise<void> {
  await api.delete(`/users/${userId}/revoke-product-owner`);
}

export async function checkProductOwnerStatus(userId: number): Promise<{ is_product_owner: boolean }> {
  const response = await api.get(`/users/${userId}/is-product-owner`);
  return response.data;
}
