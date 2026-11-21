import React, { useState } from 'react';
import { Result, Button, Card, Descriptions, Tag, Alert, Space, Typography, message } from 'antd';
import {
  ClockCircleOutlined,
  ReloadOutlined,
  LogoutOutlined,
  ShopOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const { Title, Paragraph } = Typography;

export const PendingApprovalPage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState<boolean>(false);

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is already approved or not a supplier, redirect to dashboard
  const isPending = user.role === 'SUPPLIER' && (user.isApproved === false || user.supplier?.isApproved === false);
  if (!isPending) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      await refreshUser();
      // After refresh, if approved, navigate to dashboard
      const stored = localStorage.getItem('quaudit_user');
      const parsed = stored ? JSON.parse(stored) : null;
      if (parsed?.isApproved === true || parsed?.supplier?.isApproved === true) {
        message.success('Congratulations! Your account has been approved.');
        navigate('/dashboard', { replace: true });
      } else {
        message.info('Your registration is still under supervisor review. Please check back shortly.');
      }
    } catch {
      message.info('Your registration is still under supervisor review.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)',
        padding: '32px 16px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 680,
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: '36px 32px' }}
      >
        <Result
          icon={
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#fff7ed',
                border: '2px solid #fed7aa',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f97316',
                fontSize: 36,
                margin: '0 auto',
              }}
            >
              <ClockCircleOutlined />
            </div>
          }
          title={
            <Title level={3} style={{ margin: '16px 0 8px', color: '#0f172a' }}>
              Registration Received — Pending Supervisor Approval
            </Title>
          }
          subTitle={
            <Paragraph style={{ color: '#475569', fontSize: 15, maxWidth: 520, margin: '0 auto' }}>
              Thank you for registering with <strong>QuAudit</strong>. Your supplier account and company profile have been submitted successfully and are currently awaiting review by an organization supervisor.
            </Paragraph>
          }
          extra={[
            <Space key="actions" size="middle" style={{ marginTop: 8 }}>
              <Button
                type="primary"
                icon={<ReloadOutlined spin={checking} />}
                onClick={handleCheckStatus}
                loading={checking}
                size="large"
                style={{ borderRadius: 8, padding: '0 24px' }}
              >
                Check Approval Status
              </Button>
              <Button
                icon={<LogoutOutlined />}
                onClick={() => logout()}
                size="large"
                style={{ borderRadius: 8 }}
              >
                Sign Out
              </Button>
            </Space>,
          ]}
        />

        <Alert
          type="info"
          showIcon
          icon={<SafetyCertificateOutlined />}
          message="What happens next?"
          description="Once an audit supervisor reviews and approves your registration, your account will be activated immediately. You will be able to access your dashboard, complete assigned questionnaires, and manage your product line."
          style={{ marginTop: 24, borderRadius: 8 }}
        />

        <div style={{ marginTop: 24 }}>
          <Descriptions
            title={
              <Space>
                <ShopOutlined style={{ color: '#1677ff' }} />
                <span>Submitted Registration Details</span>
              </Space>
            }
            bordered
            column={1}
            size="small"
            style={{ borderRadius: 8 }}
          >
            <Descriptions.Item label="Company Name">
              <strong>{user.supplier?.companyName || 'Not specified'}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Applicant">
              {user.firstName} {user.lastName} ({user.email})
            </Descriptions.Item>
            {user.supplier?.phone && (
              <Descriptions.Item label="Phone Number">
                {user.supplier.phone}
              </Descriptions.Item>
            )}
            {user.supplier?.address && (
              <Descriptions.Item label="Facility Address">
                {user.supplier.address}
              </Descriptions.Item>
            )}
            {user.supplier?.description && (
              <Descriptions.Item label="Description">
                {user.supplier.description}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Approval Status">
              <Tag color="orange" icon={<ClockCircleOutlined />}>
                Pending Supervisor Review
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </div>
      </Card>
    </div>
  );
};
