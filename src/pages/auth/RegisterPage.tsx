import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Alert, Divider, Row, Col } from 'antd';
import {
  LockOutlined,
  MailOutlined,
  UserOutlined,
  ShopOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RegisterDto } from '../../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const RegisterPage: React.FC = () => {
  const [form] = Form.useForm();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (values: RegisterDto & { confirmPassword?: string }) => {
    setError(null);
    setLoading(true);
    try {
      await register({
        email: values.email.trim(),
        password: values.password,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        companyName: values.companyName.trim(),
        description: values.description?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        address: values.address?.trim() || undefined,
      });
      navigate('/pending-approval', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Registration failed.');
    } finally {
      setLoading(false);
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
      <div style={{ width: '100%', maxWidth: 580 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            Supplier Self-Registration
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Register your company profile to join the QuAudit compliance & audit network
          </Text>
        </div>

        <Card
          style={{
            borderRadius: 16,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
          }}
          bodyStyle={{ padding: '32px 30px' }}
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
            <Divider orientation="left" style={{ margin: '0 0 16px 0', fontSize: 13, color: '#64748b' }}>
              <UserOutlined style={{ marginRight: 6 }} /> Applicant Information
            </Divider>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="firstName"
                  label="First Name"
                  rules={[{ required: true, message: 'First name is required' }]}
                >
                  <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder="e.g. John" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="lastName"
                  label="Last Name"
                  rules={[{ required: true, message: 'Last name is required' }]}
                >
                  <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder="e.g. Doe" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="email"
              label="Work Email"
              rules={[
                { required: true, message: 'Please enter your work email' },
                { type: 'email', message: 'Please enter a valid email address' },
              ]}
            >
              <Input prefix={<MailOutlined style={{ color: '#9ca3af' }} />} placeholder="supplier@example.com" />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[
                    { required: true, message: 'Password is required' },
                    { min: 6, message: 'Minimum 6 characters' },
                  ]}
                >
                  <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="••••••••" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="confirmPassword"
                  label="Confirm Password"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Confirm your password' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Passwords do not match'));
                      },
                    }),
                  ]}
                >
                  <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="••••••••" />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left" style={{ margin: '16px 0 16px 0', fontSize: 13, color: '#64748b' }}>
              <ShopOutlined style={{ marginRight: 6 }} /> Company & Facility Profile
            </Divider>

            <Form.Item
              name="companyName"
              label="Company Name"
              rules={[{ required: true, message: 'Company name is required' }]}
            >
              <Input prefix={<ShopOutlined style={{ color: '#9ca3af' }} />} placeholder="e.g. Acme Industrial Solutions" />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="phone" label="Contact Phone (Optional)">
                  <Input prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />} placeholder="+1-555-0199" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="address" label="Facility Address (Optional)">
                  <Input prefix={<EnvironmentOutlined style={{ color: '#9ca3af' }} />} placeholder="123 Industrial Way, Sector 4" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label="Company Description / Scope (Optional)">
              <TextArea
                rows={2}
                placeholder="Manufacturer of precision hardware and industrial appliance components"
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 24, marginBottom: 8 }}>
              <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ height: 44, borderRadius: 8 }}>
                Submit Supplier Registration
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Already registered?{' '}
              <Link to="/login" style={{ fontWeight: 600 }}>
                Sign In
              </Link>
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};
