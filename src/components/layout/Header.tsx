import React from 'react';
import {
  Layout,
  Button,
  Avatar,
  Dropdown,
  Badge,
  Tooltip,
  MenuProps,
} from 'antd';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { RoleBadge } from '../common/RoleBadge';

const { Header: AntHeader } = Layout;

interface HeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Header: React.FC<HeaderProps> = ({ collapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  if (!user) return null;

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600 }}>{user.firstName} {user.lastName}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{user.email}</div>
          <div style={{ marginTop: 4 }}>
            <RoleBadge role={user.role} />
          </div>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: 'Notifications',
      onClick: () => navigate('/notifications'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      danger: true,
      label: 'Logout',
      onClick: async () => {
        await logout();
        navigate('/login');
      },
    },
  ];

  const getAvatarBg = () => {
    switch (user.role) {
      case 'ADMIN':
        return '#722ed1';
      case 'SUPERVISOR':
        return '#1677ff';
      case 'SUPPLIER':
        return '#13c2c2';
      default:
        return '#8c8c8c';
    }
  };

  return (
    <AntHeader
      style={{
        padding: '0 24px',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(0, 21, 41, 0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 9,
        height: 64,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggleCollapse}
          style={{ fontSize: 16, width: 40, height: 40 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RoleBadge role={user.role} />
          {user.role === 'SUPPLIER' && user.supplier && (
            <span style={{ fontSize: 13, color: '#4b5563', fontWeight: 500 }}>
              {user.supplier.companyName}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Notifications */}
        <Tooltip title="Notifications">
          <Badge count={unreadCount} overflowCount={99} size="small">
            <Button
              type="text"
              icon={<BellOutlined style={{ fontSize: 18 }} />}
              onClick={() => navigate('/notifications')}
              style={{ width: 40, height: 40 }}
            />
          </Badge>
        </Tooltip>

        {/* User Dropdown */}
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 6,
              transition: 'background 0.2s',
            }}
          >
            <Avatar
              style={{
                backgroundColor: getAvatarBg(),
              }}
              icon={<UserOutlined />}
            >
              {user.firstName ? user.firstName[0] : 'U'}
            </Avatar>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>
                {user.firstName}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{user.role}</div>
            </div>
          </div>
        </Dropdown>
      </div>
    </AntHeader>
  );
};
