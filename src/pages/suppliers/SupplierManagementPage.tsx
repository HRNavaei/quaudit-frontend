import React, { useState } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Input,
  Modal,
  Form,
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
  EditOutlined,
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
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [form] = Form.useForm();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.getAll(),
  });

  const { data: pendingSuppliers = [] } = useQuery({
    queryKey: ['suppliers', 'pending'],
    queryFn: () => suppliersApi.getPending(),
  });

  const createMutation = useMutation({
    mutationFn: suppliersApi.create,
    onSuccess: () => {
      message.success('Supplier profile created successfully');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setModalVisible(false);
      form.resetFields();
    },
    onError: (err: any) => {
      message.error(err?.message || 'Failed to create supplier');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Supplier> }) =>
      suppliersApi.update(id, updates),
    onSuccess: () => {
      message.success('Supplier updated successfully');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setModalVisible(false);
      setEditingSupplier(null);
    },
    onError: (err: any) => {
      message.error(err?.message || 'Failed to update supplier');
    },
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

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      form.setFieldsValue({
        companyName: supplier.companyName,
        description: supplier.description,
        address: supplier.address,
        phone: supplier.phone,
        userId: supplier.userId,
      });
    } else {
      setEditingSupplier(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingSupplier) {
        updateMutation.mutate({
          id: editingSupplier.id,
          updates: values,
        });
      } else {
        createMutation.mutate(values);
      }
    } catch {
      // validation error
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const text = `${s.companyName} ${s.phone || ''} ${s.address || ''}`.toLowerCase();
    return text.includes(searchText.toLowerCase());
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

        <Space style={{ width: isMobile ? '100%' : 'auto' }}>
          <Button
            type="primary"
            icon={<ClockCircleOutlined />}
            onClick={() => navigate('/suppliers/pending')}
            block={isMobile}
            style={{
              height: 40,
              background: pendingSuppliers.length > 0 ? '#f59e0b' : '#1677ff',
              borderColor: pendingSuppliers.length > 0 ? '#f59e0b' : '#1677ff',
            }}
          >
            Pending Approvals {pendingSuppliers.length > 0 ? `(${pendingSuppliers.length})` : ''}
          </Button>
        </Space>
      </div>

      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search suppliers by name, address, or phone..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: isMobile ? '100%' : 340 }}
            allowClear
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
              render: () => (
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  Approved
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
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleOpenModal(record)}
                  />
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
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  Approved
                </Tag>
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

      {/* Edit Modal */}
      <Modal
        title="Edit Supplier Profile"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        confirmLoading={updateMutation.isPending}
        width={isMobile ? 'calc(100vw - 24px)' : 520}
        style={{ top: isMobile ? 16 : undefined }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="companyName"
            label="Company Name"
            rules={[{ required: true, message: 'Please enter company name' }]}
          >
            <Input placeholder="e.g. Pars Home Appliances Co." />
          </Form.Item>

          <Form.Item name="description" label="Company Description">
            <Input.TextArea rows={2} placeholder="Brief summary of manufacturing capabilities..." />
          </Form.Item>

          <Form.Item name="phone" label="Phone Number">
            <Input placeholder="+98 21 8888 0000" />
          </Form.Item>

          <Form.Item name="address" label="Factory / Office Address">
            <Input.TextArea rows={2} placeholder="Industrial zone, street, building number..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
