import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppRoutes } from './routes/AppRoutes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

export const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f5f7fa',
        },
        components: {
          Card: {
            headerHeight: 48,
          },
          Button: {
            controlHeight: 36,
          },
          Table: {
            headerBg: '#fafbfc',
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ConfigProvider>
  );
};

export default App;
