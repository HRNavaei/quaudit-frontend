import React from 'react';
import { Layout, Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  ShopOutlined,
  AppstoreOutlined,
  FormOutlined,
  SendOutlined,
  FileDoneOutlined,
  BarChartOutlined,
  BellOutlined,
  IdcardOutlined,
  AuditOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Role } from '../../types';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  if (!user) return null;

  const role = user.role;

  interface MenuItem {
    key: string;
    icon: React.ReactNode;
    label: React.ReactNode;
    roles?: Role[];
  }

  const items: MenuItem[] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    // Admin / Supervisor Only
    {
      key: '/suppliers',
      icon: <ShopOutlined />,
      label: 'Suppliers',
      roles: ['ADMIN', 'SUPERVISOR'],
    },
    {
      key: '/suppliers/pending',
      icon: <ClockCircleOutlined />,
      label: 'Pending Approvals',
      roles: ['SUPERVISOR', 'ADMIN'],
    },
    // All Roles (Suppliers see their own products)
    {
      key: '/products',
      icon: <AppstoreOutlined />,
      label: role === 'SUPPLIER' ? 'My Products' : 'Products',
    },
    // Admin / Supervisor Only
    {
      key: '/questionnaires',
      icon: <FormOutlined />,
      label: 'Questionnaires',
      roles: ['ADMIN', 'SUPERVISOR'],
    },
    {
      key: '/assignments',
      icon: <SendOutlined />,
      label: 'Assignments',
      roles: ['ADMIN', 'SUPERVISOR'],
    },
    // Supplier Only
    {
      key: '/my-assignments',
      icon: <AuditOutlined />,
      label: 'My Audits',
      roles: ['SUPPLIER'],
    },
    // Both Roles (Supervisor/Admin reviews all, Supplier reviews own responses)
    {
      key: '/responses',
      icon: <FileDoneOutlined />,
      label: 'Responses',
    },
    // Admin / Supervisor Only
    {
      key: '/analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics',
      roles: ['ADMIN', 'SUPERVISOR'],
    },
    // All
    {
      key: '/notifications',
      icon: <BellOutlined />,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span
              style={{
                background: '#ff4d4f',
                color: '#fff',
                borderRadius: 10,
                fontSize: 11,
                padding: '0 6px',
                height: 18,
                lineHeight: '18px',
                marginLeft: 8,
              }}
            >
              {unreadCount}
            </span>
          )}
        </span>
      ),
    },
    {
      key: '/profile',
      icon: <IdcardOutlined />,
      label: 'Profile',
    },
  ];

  // Filter items by current user role
  const visibleItems = items.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(role);
  });

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/questionnaires')) return '/questionnaires';
    if (path.startsWith('/assignments') && !path.startsWith('/my-assignments')) return '/assignments';
    if (path.startsWith('/my-assignments')) return '/my-assignments';
    if (path.startsWith('/products')) return '/products';
    if (path.startsWith('/suppliers')) return '/suppliers';
    if (path.startsWith('/responses')) return '/responses';
    if (path.startsWith('/analytics')) return '/analytics';
    if (path.startsWith('/notifications')) return '/notifications';
    if (path.startsWith('/profile')) return '/profile';
    return '/dashboard';
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={240}
      theme="light"
      style={{
        boxShadow: '1px 0 4px rgba(0, 21, 41, 0.04)',
        borderRight: '1px solid #f0f0f0',
        minHeight: '100vh',
      }}
    >
      {/* Brand Logo */}
      <div
        style={{
          height: 64,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          Q
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', lineHeight: 1.2 }}>
              QuAudit
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Supplier Compliance</div>
          </div>
        )}
      </div>

      <Menu
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        style={{ borderRight: 0, marginTop: 8 }}
        items={visibleItems.map((item) => ({
          key: item.key,
          icon: item.icon,
          label: item.label,
          onClick: () => navigate(item.key),
        }))}
      />
    </Sider>
  );
};
