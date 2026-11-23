import React, { useState } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Select,
  Modal,
  Form,
  Typography,
  message,
  Popconfirm,
  Tag,
  Input,
} from 'antd';
import {
  PlusOutlined,
  SendOutlined,
  UndoOutlined,
  EyeOutlined,
  ShopOutlined,
  AppstoreOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { assignmentsApi } from '../../api/assignments';
import { questionnairesApi } from '../../api/questionnaires';
import { suppliersApi } from '../../api/suppliers';
import { productsApi } from '../../api/products';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { QuestionnaireAssignment } from '../../types';

const { Title, Text } = Typography;

export const AssignmentManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [form] = Form.useForm();

  // Selected supplier in the modal (to filter product dropdown)
  const formSupplierId = Form.useWatch('supplierId', form);

  // Queries
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentsApi.getAll(),
  });

  const { data: questionnaires = [] } = useQuery({
    queryKey: ['questionnaires'],
    queryFn: () => questionnairesApi.getAll(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.getAll(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
  });

  // Automatically open modal if redirected from questionnaire list or supplier list with state
  React.useEffect(() => {
    const preselectedQId = (location.state as any)?.assignQuestionnaireId;
    const preselectedSupplierId = (location.state as any)?.supplierId;
    if (preselectedQId || preselectedSupplierId) {
      if (preselectedQId) {
        form.setFieldsValue({ questionnaireId: preselectedQId });
      }
      if (preselectedSupplierId) {
        form.setFieldsValue({ supplierId: preselectedSupplierId });
      }
      setModalVisible(true);
    }
  }, [location.state, form]);

  const createAssignmentMutation = useMutation({
    mutationFn: assignmentsApi.create,
    onSuccess: () => {
      message.success('Questionnaire assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setModalVisible(false);
      form.resetFields();
    },
    onError: (err: any) => {
      message.error(err?.message || 'Failed to assign questionnaire');
    },
  });

  const reopenMutation = useMutation({
    mutationFn: assignmentsApi.reopen,
    onSuccess: () => {
      message.success('Assignment has been re-opened for supplier revision');
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: (err: any) => {
      message.error(err?.message || 'Failed to reopen assignment');
    },
  });

  const handleOpenAssignModal = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleCreateAssignment = async () => {
    try {
      const values = await form.validateFields();
      createAssignmentMutation.mutate({
        questionnaireId: values.questionnaireId,
        supplierId: values.supplierId,
        productId: values.productId || null,
      });
    } catch {
      // validation error
    }
  };

  // Filter products for the chosen supplier in the modal
  const eligibleProducts = formSupplierId
    ? products.filter((p) => p.supplierId === formSupplierId)
    : [];

  // Filter assignments table
  const filteredAssignments = assignments.filter((a) => {
    const text = `${a.questionnaire?.title || ''} ${a.supplier?.companyName || ''} ${a.product?.name || ''}`.toLowerCase();
    const matchesSearch = !searchText || text.includes(searchText.toLowerCase());
    const matchSupplier =
      selectedSupplierFilter === 'ALL' || a.supplierId === selectedSupplierFilter;
    const matchStatus =
      selectedStatusFilter === 'ALL' || a.status === selectedStatusFilter;
    return matchesSearch && matchSupplier && matchStatus;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            Questionnaire Assignments
          </Title>
          <Text type="secondary">
            Dispatch audit questionnaires to suppliers for specific appliance product lines.
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenAssignModal}
          style={{ height: 40 }}
        >
          Assign Questionnaire
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Input
            placeholder="Search assignments by questionnaire, supplier, or product..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 340 }}
            allowClear
          />

          <Select
            showSearch
            filterOption={(input, option) =>
              (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
            }
            value={selectedSupplierFilter}
            onChange={setSelectedSupplierFilter}
            style={{ width: 220 }}
            options={[
              { value: 'ALL', label: 'All Suppliers' },
              ...suppliers.map((s) => ({ value: s.id, label: s.companyName })),
            ]}
          />

          <Select
            value={selectedStatusFilter}
            onChange={setSelectedStatusFilter}
            style={{ width: 180 }}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'SUBMITTED', label: 'Submitted' },
            ]}
          />
        </div>

        <Table
          dataSource={filteredAssignments}
          rowKey="id"
          loading={isLoading}
          locale={{
            emptyText: (
              <EmptyState
                title="No Assignments Found"
                description={
                  searchText || selectedSupplierFilter !== 'ALL' || selectedStatusFilter !== 'ALL'
                    ? 'No assignments match the selected filters.'
                    : 'No questionnaires have been assigned yet. Dispatch your first audit to a supplier.'
                }
                actionText={assignments.length === 0 ? 'Assign Questionnaire' : undefined}
                onAction={assignments.length === 0 ? handleOpenAssignModal : undefined}
              />
            ),
          }}
          columns={[
            {
              title: 'Questionnaire',
              key: 'questionnaire',
              render: (_, record: QuestionnaireAssignment) => (
                <div>
                  <Text strong style={{ color: '#0f172a', fontSize: 14 }}>
                    {record.questionnaire?.title || 'Audit Questionnaire'}
                  </Text>
                  {record.questionnaire?.status && (
                    <div style={{ marginTop: 2 }}>
                      <StatusBadge status={record.questionnaire.status} />
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: 'Assigned Supplier',
              key: 'supplier',
              render: (_, record: QuestionnaireAssignment) => (
                <div>
                  <ShopOutlined style={{ marginRight: 6, color: '#13c2c2' }} />
                  <Text strong>{record.supplier?.companyName || '—'}</Text>
                </div>
              ),
            },
            {
              title: 'Target Product',
              key: 'product',
              render: (_, record: QuestionnaireAssignment) =>
                record.product ? (
                  <div>
                    <AppstoreOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                    <span>{record.product.name}</span>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      Category: {record.product.category || 'General'}
                    </div>
                  </div>
                ) : (
                  <Tag color="default">General Facility Audit</Tag>
                ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => <StatusBadge status={status} />,
            },
            {
              title: 'Timestamps',
              key: 'timestamps',
              render: (_, record: QuestionnaireAssignment) => (
                <div style={{ fontSize: 12 }}>
                  <div>Assigned: {new Date(record.assignedAt).toLocaleDateString()}</div>
                  {record.submittedAt && (
                    <div style={{ color: '#52c41a' }}>
                      Submitted: {new Date(record.submittedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record: QuestionnaireAssignment) => (
                <Space>
                  {record.status === 'SUBMITTED' ? (
                    <>
                      <Button
                        type="primary"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => navigate('/responses', { state: { highlightId: record.id } })}
                      >
                        Review
                      </Button>

                      <Popconfirm
                        title="Re-open Assignment"
                        description="Allow the supplier to revise and resubmit their answers?"
                        onConfirm={() => reopenMutation.mutate(record.id)}
                      >
                        <Button
                          size="small"
                          icon={<UndoOutlined />}
                          loading={reopenMutation.isPending}
                        >
                          Re-open
                        </Button>
                      </Popconfirm>
                    </>
                  ) : (
                    <Button
                      size="small"
                      onClick={() => navigate(`/assignments/${record.id}/complete`)}
                    >
                      Inspect Form
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* Assign Modal */}
      <Modal
        title={
          <Space>
            <SendOutlined style={{ color: '#1677ff' }} />
            <span>Dispatch Questionnaire Assignment</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleCreateAssignment}
        confirmLoading={createAssignmentMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="questionnaireId"
            label="Questionnaire"
            rules={[
              { required: true, message: 'Please select a questionnaire' },
              {
                validator: (_, value) => {
                  const selectedQ = questionnaires.find((q) => q.id === value);
                  if (selectedQ && (selectedQ.questions?.length || 0) === 0) {
                    return Promise.reject(
                      new Error('Cannot assign a questionnaire that has no questions. Please add questions first.')
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Select
              showSearch
              placeholder="Select questionnaire to assign"
              filterOption={(input, option) =>
                (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={questionnaires.map((q) => {
                const count = q.questions?.length || 0;
                return {
                  value: q.id,
                  label: `${q.title} (${count} question${count === 1 ? '' : 's'} - ${q.status})`,
                  disabled: count === 0,
                };
              })}
            />
          </Form.Item>

          <Form.Item
            name="supplierId"
            label="Target Supplier"
            rules={[{ required: true, message: 'Please select a supplier' }]}
          >
            <Select
              showSearch
              placeholder="Select manufacturing supplier"
              filterOption={(input, option) =>
                (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={suppliers.map((s) => ({
                value: s.id,
                label: s.companyName,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="productId"
            label="Specific Product Line (Optional)"
            tooltip="Choose if this audit targets a specific certified product; leave empty for general facility-wide audit."
            help={
              formSupplierId && eligibleProducts.length === 0 ? (
                <span style={{ color: '#64748b' }}>
                  This supplier currently has no registered products. This audit will automatically target the general facility.
                </span>
              ) : undefined
            }
          >
            <Select
              showSearch
              filterOption={(input, option) =>
                (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
              placeholder={
                formSupplierId
                  ? eligibleProducts.length > 0
                    ? 'Select product (or leave empty for facility audit)'
                    : 'Facility-wide audit (No registered products)'
                  : 'Select supplier first'
              }
              allowClear
              disabled={!formSupplierId || eligibleProducts.length === 0}
              options={eligibleProducts.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.category || 'Appliance'})`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
