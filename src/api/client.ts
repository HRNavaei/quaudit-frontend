import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const TOKEN_STORAGE_KEY = 'quaudit_token';
export const USER_STORAGE_KEY = 'quaudit_user';

// In Vite, proxy sends /api to http://localhost:3000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to attach JWT
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized and 403 Pending Approval
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token on 401
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      // Dispatch custom event so app can redirect or update auth state
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    } else if (
      error.response?.status === 403 &&
      (error.response?.data as any)?.message === 'Supplier account is pending supervisor approval'
    ) {
      window.dispatchEvent(new CustomEvent('auth:pending-approval'));
    }
    return Promise.reject(error);
  }
);
