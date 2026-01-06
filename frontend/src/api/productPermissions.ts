import type { ProductPermission, ProductPermissionCreatePayload } from '@/types';

const API_BASE = '/api';

export async function grantProductPermissions(
  productId: number,
  payload: ProductPermissionCreatePayload
): Promise<ProductPermission[]> {
  const userId = localStorage.getItem('currentUserId');

  const response = await fetch(`${API_BASE}/products/${productId}/permissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId || '1',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to grant permissions');
  }

  return response.json();
}

export async function getProductPermissions(productId: number): Promise<ProductPermission[]> {
  const userId = localStorage.getItem('currentUserId');

  const response = await fetch(`${API_BASE}/products/${productId}/permissions`, {
    headers: {
      'X-User-Id': userId || '1',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch permissions');
  }

  return response.json();
}

export async function revokeProductPermission(
  productId: number,
  userId: number
): Promise<void> {
  const currentUserId = localStorage.getItem('currentUserId');

  const response = await fetch(`${API_BASE}/products/${productId}/permissions/${userId}`, {
    method: 'DELETE',
    headers: {
      'X-User-Id': currentUserId || '1',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to revoke permission');
  }
}
