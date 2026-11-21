import { apiClient } from './client';
import { Supplier } from '../types';

export const suppliersApi = {
  getAll: async (): Promise<Supplier[]> => {
    const response = await apiClient.get<Supplier[]>('/suppliers');
    return response.data;
  },

  getById: async (id: string): Promise<Supplier> => {
    const response = await apiClient.get<Supplier>(`/suppliers/${id}`);
    return response.data;
  },

  getMyProfile: async (): Promise<Supplier> => {
    const response = await apiClient.get<Supplier>('/suppliers/me');
    return response.data;
  },

  getPending: async (): Promise<Supplier[]> => {
    const response = await apiClient.get<Supplier[]>('/suppliers/pending');
    return response.data;
  },

  approve: async (id: string): Promise<Supplier> => {
    const response = await apiClient.patch<Supplier>(`/suppliers/${id}/approve`);
    return response.data;
  },

  create: async (data: {
    companyName: string;
    description?: string;
    address?: string;
    phone?: string;
    userId?: string;
  }): Promise<Supplier> => {
    const response = await apiClient.post<Supplier>('/suppliers', data);
    return response.data;
  },

  update: async (id: string, updates: Partial<Supplier>): Promise<Supplier> => {
    const response = await apiClient.patch<Supplier>(`/suppliers/${id}`, updates);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`);
  },
};
