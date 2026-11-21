import { apiClient, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from './client';
import { AuthResponse, LoginDto, RegisterDto, User } from '../types';

export const authApi = {
  login: async (dto: LoginDto): Promise<AuthResponse> => {
    const response = await apiClient.post<{ access_token: string }>('/auth/login', dto);
    const token = response.data.access_token;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);

    const userRes = await apiClient.get<User>('/users/me');
    let supplierProfile = null;
    let isApproved = true;

    if (userRes.data.role === 'SUPPLIER') {
      try {
        const supRes = await apiClient.get('/suppliers/me');
        supplierProfile = supRes.data;
        isApproved = supRes.data.isApproved ?? true;
      } catch (err: any) {
        if (err?.response?.status === 403) {
          isApproved = false;
          supplierProfile = { isApproved: false };
        }
      }
    }

    const fullUser: User = {
      ...userRes.data,
      isApproved,
      supplier: supplierProfile || userRes.data.supplier || null,
    };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fullUser));

    return {
      access_token: token,
      user: fullUser,
    };
  },

  register: async (dto: RegisterDto): Promise<AuthResponse> => {
    const response = await apiClient.post<{
      message: string;
      access_token: string;
      user: User;
      supplier: any;
    }>('/auth/register', dto);

    const token = response.data.access_token;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);

    const fullUser: User = {
      ...response.data.user,
      isApproved: response.data.supplier?.isApproved ?? false,
      supplier: response.data.supplier,
    };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fullUser));

    return {
      access_token: token,
      user: fullUser,
    };
  },

  getCurrentUser: async (): Promise<User> => {
    const userRes = await apiClient.get<User>('/users/me');
    let supplierProfile = null;
    let isApproved = true;

    if (userRes.data.role === 'SUPPLIER') {
      try {
        const supRes = await apiClient.get('/suppliers/me');
        supplierProfile = supRes.data;
        isApproved = supRes.data.isApproved ?? true;
      } catch (err: any) {
        if (err?.response?.status === 403) {
          isApproved = false;
          supplierProfile = { isApproved: false };
        }
      }
    }

    const fullUser: User = {
      ...userRes.data,
      isApproved,
      supplier: supplierProfile || userRes.data.supplier || null,
    };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fullUser));
    return fullUser;
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  },
};
