import { apiClient } from './client';
import { Product } from '../types';

export const productsApi = {
  getAll: async (supplierId?: string): Promise<Product[]> => {
    const response = await apiClient.get<Product[]>('/products', {
      params: supplierId ? { supplierId } : undefined,
    });
    return response.data;
  },

  getById: async (id: string): Promise<Product> => {
    const response = await apiClient.get<Product>(`/products/${id}`);
    return response.data;
  },

  create: async (data: {
    name: string;
    description?: string;
    category?: string;
    supplierId?: string;
  }): Promise<Product> => {
    const response = await apiClient.post<Product>('/products', data);
    return response.data;
  },

  update: async (
    id: string,
    updates: { name?: string; description?: string | null; category?: string | null }
  ): Promise<Product> => {
    const { name, description, category } = updates as any;
    const cleanUpdates: { name?: string; description?: string; category?: string } = {};
    if (name !== undefined && name !== null) cleanUpdates.name = name;
    if (description !== undefined && description !== null) cleanUpdates.description = description;
    if (category !== undefined && category !== null) cleanUpdates.category = category;
    const response = await apiClient.patch<Product>(`/products/${id}`, cleanUpdates);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },
};
