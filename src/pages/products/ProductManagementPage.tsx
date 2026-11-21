import React, { useState } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  Popconfirm,
  Typography,
  message,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../../api/products';
import { suppliersApi } from '../../api/suppliers';
import { useAuth } from '../../context/AuthContext';
import { Product } from '../../types';

const { Title, Text, Paragraph } = Typography;

export const ProductManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSupplier = user?.role === 'SUPPLIER';

  const [searchText, setSearchText] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();

  const currentSupplierId = isSupplier ? user?.supplier?.id : undefined;

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', currentSupplierId],
    queryFn: () => productsApi.getAll(currentSupplierId),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.getAll(),
    enabled: !isSupplier,
  });

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      message.success('Product registered successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setModalVisible(false);
      form.resetFields();
    },
    onError: (err: any) => {
      message.error(err?.message || 'Failed to register product');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Product> }) =>
      productsApi.update(id, updates),
    onSuccess: () => {
      message.success('Product updated successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setModalVisible(false);
      setEditingProduct(null);
    },
    onError: (err: any) => {
      message.error(err?.message || 'Failed to update product');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      message.success('Product deleted');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      message.error(err?.message || 'Failed to delete product');
    },
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      form.setFieldsValue({
        name: product.name,
        category: product.category,
        description: product.description,
        supplierId: product.supplierId,
      });
    } else {
      setEditingProduct(null);
      form.resetFields();
      if (isSupplier && user?.supplier) {
        form.setFieldsValue({ supplierId: user.supplier.id });
      }
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        supplierId: isSupplier && user?.supplier ? user.supplier.id : values.supplierId,
      };

      if (editingProduct) {
        updateMutation.mutate({
          id: editingProduct.id,
          updates: payload,
        });
      } else {
        createMutation.mutate(payload);
      }
    } catch {
      // validation error
    }
  };

  const filteredProducts = products.filter((p) => {
    const text = `${p.name} ${p.category || ''} ${p.description || ''}`.toLowerCase();
    const matchesSearch = text.includes(searchText.toLowerCase());
    const matchesSupplier =
      selectedSupplierId === 'ALL' || p.supplierId === selectedSupplierId;
    return matchesSearch && matchesSupplier;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            {isSupplier ? 'My Registered Products' : 'Product Management'}
          </Title>
          <Text type="secondary">
            {isSupplier
              ? 'Catalog of appliances and components manufactured by your company subjected to quality audits.'
              : 'Appliance catalog, model numbers, and targeted product lines across all suppliers.'}
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
          style={{ height: 40 }}
        >
          Add Product
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Input
            placeholder="Search products by model or category..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 320 }}
            allowClear
          />

          {!isSupplier && (
            <Select
              value={selectedSupplierId}
              onChange={setSelectedSupplierId}
              style={{ width: 240 }}
              options={[
                { value: 'ALL', label: 'All Suppliers' },
                ...suppliers.map((s) => ({ value: s.id, label: s.companyName })),
              ]}
            />
          )}
        </div>

        <Table
          dataSource={filteredProducts}
          rowKey="id"
          loading={isLoading}
          columns={[
            {
              title: 'Product / Model',
              key: 'name',
              render: (_, record) => (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AppstoreOutlined style={{ color: '#1677ff', fontSize: 16 }} />
                    <Text strong style={{ color: '#0f172a' }}>
                      {record.name}
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
              title: 'Category',
              dataIndex: 'category',
              key: 'category',
              render: (cat: string) => (
                <Tag color="geekblue">{cat || 'General'}</Tag>
              ),
            },
            ...(!isSupplier
              ? [
                  {
                    title: 'Manufacturer / Supplier',
                    key: 'supplier',
                    render: (_: any, record: Product) => (
                      <span style={{ fontSize: 13 }}>
                        <ShopOutlined style={{ marginRight: 6, color: '#13c2c2' }} />
                        {record.supplier?.companyName || '—'}
                      </span>
                    ),
                  },
                ]
              : []),
            {
              title: 'Created At',
              dataIndex: 'createdAt',
              key: 'createdAt',
              render: (date: string) => (date ? new Date(date).toLocaleDateString() : '—'),
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record) => (
                <Space>
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleOpenModal(record)}
                  />
                  <Popconfirm
                    title="Delete Product"
                    description="Are you sure you want to remove this product?"
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
        />
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        title={editingProduct ? 'Edit Product' : 'Register New Product'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Product Name / Model"
            rules={[{ required: true, message: 'Please enter product name' }]}
          >
            <Input placeholder="e.g. FrostMaster Smart Refrigerator (520L)" />
          </Form.Item>

          <Form.Item
            name="category"
            label="Product Category"
            rules={[{ required: true, message: 'Please specify category' }]}
          >
            <Select
              placeholder="Select category"
              options={[
                { value: 'Refrigeration', label: 'Refrigeration & Cooling' },
                { value: 'Laundry', label: 'Washing & Laundry' },
                { value: 'Cooking', label: 'Stoves, Ovens & Cooking' },
                { value: 'Heating', label: 'Water Heaters & Climate' },
                { value: 'Small Appliance', label: 'Small Kitchen Appliances' },
                { value: 'Electronics', label: 'Control Boards & Components' },
              ]}
            />
          </Form.Item>

          {!isSupplier && (
            <Form.Item
              name="supplierId"
              label="Assigned Supplier"
              rules={[{ required: true, message: 'Select supplier' }]}
            >
              <Select
                placeholder="Choose manufacturing supplier"
                options={suppliers.map((s) => ({ value: s.id, label: s.companyName }))}
              />
            </Form.Item>
          )}

          <Form.Item name="description" label="Technical Specifications & Notes">
            <Input.TextArea rows={3} placeholder="Key features, certifications, capacity..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
