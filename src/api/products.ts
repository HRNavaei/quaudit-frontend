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

  update: async (id: string, updates: Partial<Product>): Promise<Product> => {
    const response = await apiClient.patch<Product>(`/products/${id}`, updates);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },
};
