import { apiClient } from './client';
import { Notification } from '../types';

export const notificationsApi = {
  getAll: async (): Promise<Notification[]> => {
    const response = await apiClient.get<Notification[]>('/notifications');
    return response.data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all');
  },
};
