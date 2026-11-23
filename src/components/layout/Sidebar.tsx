import React from 'react';
import { Layout, Menu, Drawer, Button } from 'antd';
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
  CloseOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Role } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { suppliersApi } from '../../api/suppliers';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onCollapse,
  isMobile = false,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  if (!user) return null;

  const role = user.role;

  const { data: pendingSuppliers = [] } = useQuery({
    queryKey: ['pendingSuppliers'],
    queryFn: () => suppliersApi.getPending(),
    enabled: role === 'SUPERVISOR' || role === 'ADMIN',
    refetchInterval: 15000,
  });
  const pendingCount = pendingSuppliers.length;

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
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Pending Approvals</span>
          {pendingCount > 0 && (
            <span
              style={{
                background: '#faad14',
                color: '#fff',
                borderRadius: 10,
                fontSize: 11,
                padding: '0 6px',
                height: 18,
                lineHeight: '18px',
                marginLeft: 8,
                fontWeight: 600,
              }}
            >
              {pendingCount}
            </span>
          )}
        </span>
      ),
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
    if (path.startsWith('/suppliers/pending')) return '/suppliers/pending';
    if (path.startsWith('/suppliers')) return '/suppliers';
    if (path.startsWith('/responses')) return '/responses';
    if (path.startsWith('/analytics')) return '/analytics';
    if (path.startsWith('/notifications')) return '/notifications';
    if (path.startsWith('/profile')) return '/profile';
    return '/dashboard';
  };

  const menuNode = (
    <Menu
      mode="inline"
      selectedKeys={[getSelectedKey()]}
      style={{ borderRight: 0, marginTop: 8 }}
      items={visibleItems.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: item.label,
        onClick: () => {
          navigate(item.key);
          if (isMobile && onCloseMobile) {
            onCloseMobile();
          }
        },
      }))}
    />
  );

  if (isMobile) {
    return (
      <Drawer
        open={mobileOpen}
        onClose={onCloseMobile}
        placement="left"
        width={270}
        styles={{
          body: { padding: 0, display: 'flex', flexDirection: 'column' },
          header: { display: 'none' },
        }}
        closable={false}
      >
        {/* Brand Logo & Close button */}
        <div
          style={{
            height: 64,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', lineHeight: 1.2 }}>
                QuAudit
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Supplier Compliance</div>
            </div>
          </div>
          <Button
            type="text"
            icon={<CloseOutlined style={{ fontSize: 16, color: '#64748b' }} />}
            onClick={onCloseMobile}
            style={{ width: 36, height: 36 }}
            aria-label="Close Navigation"
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {menuNode}
        </div>
      </Drawer>
    );
  }

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      trigger={null}
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

      {menuNode}
    </Sider>
  );
};
