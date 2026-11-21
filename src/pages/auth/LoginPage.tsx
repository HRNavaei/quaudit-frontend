import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Space, Alert, Tag } from 'antd';
import { LockOutlined, MailOutlined, CrownOutlined } from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoginDto } from '../../types';

const { Title, Text } = Typography;

export const LoginPage: React.FC = () => {
  const [form] = Form.useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (values: LoginDto) => {
    setError(null);
    setLoading(true);
    try {
      await login(values);
      const stored = localStorage.getItem('quaudit_user');
      const currentUser = stored ? JSON.parse(stored) : null;
      if (
        currentUser?.role === 'SUPPLIER' &&
        (currentUser.isApproved === false || currentUser.supplier?.isApproved === false)
      ) {
        navigate('/pending-approval', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (email: string, pass: string) => {
    form.setFieldsValue({ email, password: pass });
    handleSubmit({ email, password: pass });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)',
        padding: '24px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              display: 'inline-flex',
              width: 52,
              height: 52,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 26,
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(22, 119, 255, 0.35)',
              marginBottom: 12,
            }}
          >
            Q
          </div>
          <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            QuAudit
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Supplier Monitoring & Questionnaire Management
          </Text>
        </div>

        <Card
          style={{
            borderRadius: 12,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
          }}
          bodyStyle={{ padding: '32px 28px' }}
        >
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              style={{ marginBottom: 20 }}
            />
          )}

          <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark="optional">
            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
                placeholder="name@company.com"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                placeholder="••••••••"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 24 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                style={{ fontWeight: 600, height: 44 }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ fontWeight: 600 }}>
                Register as Supplier
              </Link>
            </Text>
          </div>

          {import.meta.env.DEV && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px dashed #e2e8f0' }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center', marginBottom: 12, fontWeight: 500 }}>
                QUICK SEEDED ACCOUNTS (ONE CLICK LOGIN)
              </Text>

              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Button
                  block
                  size="middle"
                  icon={<CrownOutlined style={{ color: '#722ed1' }} />}
                  onClick={() => handleQuickFill('admin@quaudit.com', 'Admin@123456')}
                  style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span>Admin: <strong>admin@quaudit.com</strong></span>
                  <Tag color="purple">ADMIN</Tag>
                </Button>
              </Space>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
