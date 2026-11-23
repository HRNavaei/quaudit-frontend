import React, { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useIsMobile } from '../../hooks/useIsMobile';

const { Content } = Layout;

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const isMobile = useIsMobile();

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa', maxWidth: '100vw', overflowX: 'hidden' }}>
      <Sidebar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileDrawerOpen}
        onCloseMobile={() => setMobileDrawerOpen(false)}
      />
      <Layout style={{ background: '#f5f7fa', minWidth: 0, width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
        <Header
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          isMobile={isMobile}
          onOpenMobileMenu={() => setMobileDrawerOpen(true)}
        />
        <Content
          style={{
            margin: isMobile ? '16px 12px' : '24px',
            padding: 0,
            minHeight: 'calc(100vh - 112px)',
            minWidth: 0,
            maxWidth: '100%',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
