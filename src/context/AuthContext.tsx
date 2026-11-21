import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, LoginDto, RegisterDto } from '../types';
import { authApi } from '../api/auth';
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../api/client';
import { message } from 'antd';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
      message.warning('Your session has expired. Please log in again.');
    };

    const handlePendingApproval = () => {
      setUser((prev) =>
        prev
          ? {
              ...prev,
              isApproved: false,
              supplier: prev.supplier ? { ...prev.supplier, isApproved: false } : null,
            }
          : null
      );
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('auth:pending-approval', handlePendingApproval);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('auth:pending-approval', handlePendingApproval);
    };
  }, [initAuth]);

  const login = async (dto: LoginDto) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(dto);
      setUser(response.user || null);
      message.success(`Welcome back, ${response.user?.firstName || 'User'}!`);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (dto: RegisterDto) => {
    setIsLoading(true);
    try {
      const response = await authApi.register(dto);
      setUser(response.user || null);
      message.success('Registration successful! Please sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    message.info('Logged out successfully.');
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (e) {
      console.warn('Failed to refresh user', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
