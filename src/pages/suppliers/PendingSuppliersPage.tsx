import React from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Typography,
  Tag,
  Popconfirm,
  message,
  Empty,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ShopOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { suppliersApi } from '../../api/suppliers';
import { Supplier } from '../../types';

const { Title, Text } = Typography;

export const PendingSuppliersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: pendingSuppliers = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['suppliers', 'pending'],
    queryFn: () => suppliersApi.getPending(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.approve(id),
    onSuccess: () => {
      message.success('Supplier registration approved successfully! Account is now active.');
      queryClient.invalidateQueries({ queryKey: ['suppliers', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || err?.message || 'Failed to approve supplier');
    },
  });

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Space align="center" size="middle">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/suppliers')}>
            Back to Suppliers
          </Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
                Pending Supplier Registrations
              </Title>
              <Tag color="orange" style={{ fontSize: 13, padding: '2px 8px', borderRadius: 10 }}>
                {pendingSuppliers.length} Pending
              </Tag>
            </div>
            <Text type="secondary">
              Review new vendor onboarding applications and grant access to the QuAudit platform.
            </Text>
          </div>
        </Space>

        <Button
          icon={<ReloadOutlined spin={isRefetching} />}
          onClick={() => refetch()}
          loading={isRefetching}
        >
          Refresh List
        </Button>
      </div>

      <Card
        bordered={false}
        style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <Table<Supplier>
          dataSource={pendingSuppliers}
          rowKey="id"
          loading={isLoading}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <Text strong style={{ display: 'block', fontSize: 15, color: '#334155' }}>
                      No Pending Registrations
                    </Text>
                    <Text type="secondary">
                      All supplier accounts have been reviewed and approved.
                    </Text>
                  </div>
                }
              />
            ),
          }}
          columns={[
            {
              title: 'Company & Facility',
              key: 'company',
              render: (_, record) => (
                <div>
                  <Space align="center" style={{ marginBottom: 2 }}>
                    <ShopOutlined style={{ color: '#1677ff', fontSize: 16 }} />
                    <Text strong style={{ color: '#0f172a', fontSize: 14 }}>
                      {record.companyName}
                    </Text>
                  </Space>
                  {record.description && (
                    <div style={{ fontSize: 12, color: '#64748b', maxWidth: 320 }}>
                      {record.description}
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: 'Applicant Contact',
              key: 'applicant',
              render: (_, record) => (
                <div>
                  <div style={{ fontWeight: 500, color: '#1e293b' }}>
                    {record.user
                      ? `${record.user.firstName} ${record.user.lastName}`
                      : 'Self-Registered Supplier'}
                  </div>
                  {record.user?.email && (
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      <MailOutlined style={{ marginRight: 4 }} />
                      <a href={`mailto:${record.user.email}`}>{record.user.email}</a>
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: 'Contact Information',
              key: 'contact',
              render: (_, record) => (
                <div style={{ fontSize: 12, color: '#475569' }}>
                  {record.phone ? (
                    <div>
                      <PhoneOutlined style={{ marginRight: 4, color: '#94a3b8' }} />
                      <span>{record.phone}</span>
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>No phone provided</span>
                  )}
                  {record.address && (
                    <div style={{ marginTop: 2 }}>
                      <EnvironmentOutlined style={{ marginRight: 4, color: '#94a3b8' }} />
                      <Text ellipsis style={{ maxWidth: 220, color: '#64748b' }}>
                        {record.address}
                      </Text>
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: 'Registered At',
              dataIndex: 'createdAt',
              key: 'createdAt',
              render: (date: string) => (
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {date ? new Date(date).toLocaleString() : '—'}
                </span>
              ),
            },
            {
              title: 'Status',
              key: 'status',
              render: () => (
                <Tag color="orange" icon={<ClockCircleOutlined />}>
                  Awaiting Review
                </Tag>
              ),
            },
            {
              title: 'Action',
              key: 'action',
              render: (_, record) => (
                <Popconfirm
                  title="Approve Supplier Account"
                  description={`Are you sure you want to approve "${record.companyName}"? They will receive full access to the supplier portal.`}
                  onConfirm={() => approveMutation.mutate(record.id)}
                  okText="Yes, Approve"
                  cancelText="Cancel"
                  okButtonProps={{ loading: approveMutation.isPending && approveMutation.variables === record.id }}
                >
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    loading={approveMutation.isPending && approveMutation.variables === record.id}
                    style={{
                      background: '#10b981',
                      borderColor: '#10b981',
                    }}
                  >
                    Approve Supplier
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};
