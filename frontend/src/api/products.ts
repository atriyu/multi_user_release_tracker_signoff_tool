import api from './client';
import type { Product } from '@/types';

export async function getProducts(): Promise<Product[]> {
  const { data } = await api.get('/products');
  return data;
}

export async function getProduct(id: number): Promise<Product> {
  const { data } = await api.get(`/products/${id}`);
  return data;
}

export async function createProduct(product: { name: string; description?: string }): Promise<Product> {
  const { data } = await api.post('/products', product);
  return data;
}

export async function updateProduct(
  id: number,
  product: { name?: string; description?: string; default_template_id?: number | null }
): Promise<Product> {
  const { data } = await api.put(`/products/${id}`, product);
  return data;
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/products/${id}`);
}
