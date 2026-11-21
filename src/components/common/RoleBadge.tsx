import React from 'react';
import { Tag } from 'antd';
import { SafetyCertificateOutlined, ShopOutlined, CrownOutlined } from '@ant-design/icons';
import { Role } from '../../types';

interface RoleBadgeProps {
  role: Role;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  switch (role) {
    case 'ADMIN':
      return (
        <Tag color="purple" icon={<CrownOutlined />}>
          ADMIN
        </Tag>
      );
    case 'SUPERVISOR':
      return (
        <Tag color="blue" icon={<SafetyCertificateOutlined />}>
          SUPERVISOR
        </Tag>
      );
    case 'SUPPLIER':
      return (
        <Tag color="cyan" icon={<ShopOutlined />}>
          SUPPLIER
        </Tag>
      );
    default:
      return <Tag>{role}</Tag>;
  }
};
