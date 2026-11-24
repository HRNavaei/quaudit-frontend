import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Avatar,
  Button,
  Form,
  Input,
  message,
  Divider,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  ShopOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../../components/common/RoleBadge';
import { suppliersApi } from '../../api/suppliers';

const { Title, Text } = Typography;

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);

  if (!user) return null;

  const isSupplier = user.role === 'SUPPLIER';

  const handleUpdate = async (values: any) => {
    setLoading(true);
    try {
      if (isSupplier && user.supplier) {
        await suppliersApi.update(user.supplier.id, {
          companyName: values.companyName,
          phone: values.phone,
          address: values.address,
        });
        await refreshUser();
        message.success('Company profile updated successfully');
      } else {
        message.info('Account credentials are authenticated and managed by the system.');
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
          User Profile & Organization Details
        </Title>
        <Text type="secondary">
          Manage your contact credentials and verified manufacturing identity.
        </Text>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} md={8}>
          <Card
            bordered={false}
            style={{ borderRadius: 8, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            bodyStyle={{ padding: '32px 20px' }}
          >
            <Avatar
              size={84}
              style={{
                backgroundColor:
                  user.role === 'ADMIN' || user.role === 'SUPERVISOR'
                    ? '#1677ff'
                    : '#13c2c2',
                fontSize: 32,
                marginBottom: 16,
              }}
            >
              {user.firstName[0]}
            </Avatar>

            <Title level={4} style={{ margin: 0 }}>
              {user.firstName} {user.lastName}
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              {user.email}
            </Text>

            <RoleBadge role={user.role} />

            <Divider style={{ margin: '20px 0' }} />

            <div style={{ textAlign: 'left', fontSize: 13, color: '#4b5563' }}>
              <div style={{ marginBottom: 8 }}>
                <MailOutlined style={{ marginRight: 8, color: '#9ca3af' }} />
                {user.email}
              </div>
              {user.supplier && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <ShopOutlined style={{ marginRight: 8, color: '#9ca3af' }} />
                    {user.supplier.companyName}
                  </div>
                  {user.supplier.phone && (
                    <div style={{ marginBottom: 8 }}>
                      <PhoneOutlined style={{ marginRight: 8, color: '#9ca3af' }} />
                      {user.supplier.phone}
                    </div>
                  )}
                  {user.supplier.address && (
                    <div>
                      <EnvironmentOutlined style={{ marginRight: 8, color: '#9ca3af' }} />
                      {user.supplier.address}
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card
            title="Edit Profile Information"
            bordered={false}
            style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                companyName: user.supplier?.companyName || '',
                phone: user.supplier?.phone || '',
                address: user.supplier?.address || '',
              }}
              onFinish={handleUpdate}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item
                  name="firstName"
                  label="First Name"
                >
                  <Input prefix={<UserOutlined />} disabled />
                </Form.Item>

                <Form.Item
                  name="lastName"
                  label="Last Name"
                >
                  <Input prefix={<UserOutlined />} disabled />
                </Form.Item>
              </div>

              <Form.Item name="email" label="Email Address">
                <Input prefix={<MailOutlined />} disabled />
              </Form.Item>

              {isSupplier && (
                <>
                  <Divider orientation="left" style={{ margin: '16px 0 12px' }}>
                    Supplier Company Details
                  </Divider>

                  <Form.Item
                    name="companyName"
                    label="Company Name"
                    rules={[{ required: true, message: 'Company name required' }]}
                  >
                    <Input prefix={<ShopOutlined />} />
                  </Form.Item>

                  <Form.Item name="phone" label="Contact Telephone">
                    <Input prefix={<PhoneOutlined />} />
                  </Form.Item>

                  <Form.Item name="address" label="Manufacturing Plant / Office Address">
                    <Input.TextArea rows={2} placeholder="Industrial zone, street, building number..." />
                  </Form.Item>
                </>
              )}

              <Form.Item style={{ marginTop: 20 }}>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                  Save Changes
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
