import React, { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const { Content } = Layout;

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout style={{ background: '#f5f7fa' }}>
        <Header collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
        <Content
          style={{
            margin: '24px',
            padding: 0,
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
