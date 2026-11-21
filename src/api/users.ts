import { apiClient } from './client';
import { User } from '../types';

export const usersApi = {
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },
};
