import React, { useState } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Input,
  Select,
  Popconfirm,
  Typography,
  message,
  Drawer,
  Descriptions,
  List,
  Tag,
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  ShopOutlined,
  EyeOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SendOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { suppliersApi } from '../../api/suppliers';
import { EmptyState } from '../../components/common/EmptyState';
import { Supplier } from '../../types';
import { useIsMobile } from '../../hooks/useIsMobile';

const { Title, Text, Paragraph } = Typography;

export const SupplierManagementPage: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: suppliersApi.delete,
    onSuccess: () => {
      message.success('Supplier deleted');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => {
      message.error(err?.message || 'Failed to delete supplier');
    },
  });

  const filteredSuppliers = suppliers.filter((s) => {
    const text = `${s.companyName} ${s.phone || ''} ${s.address || ''}`.toLowerCase();
    const matchesSearch = text.includes(searchText.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'APPROVED' && s.isApproved) ||
      (statusFilter === 'PENDING' && !s.isApproved);
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            Supplier Management
          </Title>
          <Text type="secondary">
            Oversee contracted appliance manufacturers, component suppliers, and production facilities.
          </Text>
        </div>
      </div>

      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Input
            placeholder="Search suppliers by name, address, or phone..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ flex: isMobile ? '1 1 100%' : '1 1 300px', minWidth: 200 }}
            allowClear
          />

          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: isMobile ? '100%' : 180 }}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'APPROVED', label: 'Approved Only' },
              { value: 'PENDING', label: 'Pending Approval' },
            ]}
          />
        </div>

        <Table
          dataSource={filteredSuppliers}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 'max-content' }}
          columns={[
            {
              title: 'Company Name',
              key: 'companyName',
              render: (_, record) => (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShopOutlined style={{ color: '#13c2c2', fontSize: 16 }} />
                    <Text strong style={{ color: '#0f172a' }}>
                      {record.companyName}
                    </Text>
                  </div>
                  {record.description && (
                    <Paragraph
                      type="secondary"
                      ellipsis={{ rows: 1 }}
                      style={{ margin: '2px 0 0 24px', fontSize: 12 }}
                    >
                      {record.description}
                    </Paragraph>
                  )}
                </div>
              ),
            },
            {
              title: 'Contact & Location',
              key: 'contact',
              render: (_, record) => (
                <div style={{ fontSize: 13 }}>
                  {record.phone && (
                    <div>
                      <PhoneOutlined style={{ marginRight: 6, color: '#64748b' }} />
                      {record.phone}
                    </div>
                  )}
                  {record.address && (
                    <div style={{ color: '#64748b' }}>
                      <EnvironmentOutlined style={{ marginRight: 6, color: '#64748b' }} />
                      {record.address}
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: 'Certified Products',
              key: 'products',
              render: (_, record) => (
                <Tag color="blue">
                  {record.products?.length || 0} Products
                </Tag>
              ),
            },
            {
              title: 'Account User',
              key: 'user',
              render: (_, record) => (
                <span style={{ fontSize: 13 }}>
                  {record.user ? `${record.user.firstName} ${record.user.lastName} (${record.user.email})` : '—'}
                </span>
              ),
            },
            {
              title: 'Status',
              key: 'status',
              render: (_, record) =>
                record.isApproved ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>
                    Approved
                  </Tag>
                ) : (
                  <Tag color="gold" icon={<ClockCircleOutlined />}>
                    Pending Approval
                  </Tag>
                ),
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record) => (
                <Space>
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => setViewSupplier(record)}
                  >
                    View
                  </Button>
                  <Popconfirm
                    title="Delete Supplier"
                    description="This will delete the supplier and cascade to products. Continue?"
                    onConfirm={() => deleteMutation.mutate(record.id)}
                    okText="Delete"
                    cancelText="Cancel"
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
          locale={{
            emptyText: (
              <EmptyState
                title="No Suppliers Found"
                description={
                  searchText
                    ? 'No suppliers match your search criteria.'
                    : 'No approved suppliers in the directory yet.'
                }
              />
            ),
          }}
        />
      </Card>

      {/* View Drawer */}
      <Drawer
        title={viewSupplier?.companyName || 'Supplier Profile'}
        placement="right"
        width={isMobile ? '100%' : 500}
        onClose={() => setViewSupplier(null)}
        open={!!viewSupplier}
        extra={
          viewSupplier && (
            <Space>
              {viewSupplier.isApproved ? (
                <Button
                  type="primary"
                  size="small"
                  icon={<SendOutlined />}
                  onClick={() => {
                    const sId = viewSupplier.id;
                    setViewSupplier(null);
                    navigate('/assignments', { state: { supplierId: sId } });
                  }}
                >
                  Dispatch Audit
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  onClick={() => {
                    setViewSupplier(null);
                    navigate('/suppliers/pending');
                  }}
                >
                  Review & Approve
                </Button>
              )}
              <Button
                size="small"
                icon={<AppstoreOutlined />}
                onClick={() => {
                  const sId = viewSupplier.id;
                  setViewSupplier(null);
                  navigate('/products', { state: { supplierId: sId } });
                }}
              >
                Products
              </Button>
            </Space>
          )
        }
      >
        {viewSupplier && (
          <div>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Company Name">
                <strong>{viewSupplier.companyName}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {viewSupplier.description || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">{viewSupplier.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Address">{viewSupplier.address || '—'}</Descriptions.Item>
              <Descriptions.Item label="Primary User">
                {viewSupplier.user ? `${viewSupplier.user.firstName} ${viewSupplier.user.lastName} (${viewSupplier.user.email})` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Approval Status">
                {viewSupplier.isApproved ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>
                    Approved
                  </Tag>
                ) : (
                  <Tag color="gold" icon={<ClockCircleOutlined />}>
                    Pending Approval
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Registered Since">
                {new Date(viewSupplier.createdAt).toLocaleDateString()}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 16 }}>
              Products Under Supervision ({viewSupplier.products?.length || 0})
            </Title>
            <List
              dataSource={viewSupplier.products || []}
              renderItem={(prod) => (
                <List.Item>
                  <List.Item.Meta
                    title={prod.name}
                    description={`Category: ${prod.category || 'General'} — ${prod.description || ''}`}
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
};
