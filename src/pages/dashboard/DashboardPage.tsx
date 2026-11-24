import React from 'react';
import { Row, Col, Card, Statistic, Button, Table, Typography, Space, Progress, Tag, Alert } from 'antd';
import {
  ShopOutlined,
  AppstoreOutlined,
  FormOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  AuditOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { suppliersApi } from '../../api/suppliers';
import { productsApi } from '../../api/products';
import { questionnairesApi } from '../../api/questionnaires';
import { assignmentsApi } from '../../api/assignments';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { useIsMobile } from '../../hooks/useIsMobile';

const { Title, Text, Paragraph } = Typography;

export const DashboardPage: React.FC = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Queries
  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.getAll(),
    enabled: user?.role === 'SUPERVISOR' || user?.role === 'ADMIN',
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(user?.role === 'SUPPLIER' && user.supplier ? user.supplier.id : undefined),
  });

  const { data: questionnaires = [], isLoading: loadingQuestionnaires } = useQuery({
    queryKey: ['questionnaires'],
    queryFn: () => questionnairesApi.getAll(),
    enabled: user?.role === 'SUPERVISOR' || user?.role === 'ADMIN',
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['assignments', user?.role, user?.supplier?.id],
    queryFn: () =>
      assignmentsApi.getAll(
        user?.role === 'SUPPLIER' && user.supplier ? { supplierId: user.supplier.id } : undefined
      ),
  });

  const { data: pendingSuppliers = [] } = useQuery({
    queryKey: ['suppliers', 'pending'],
    queryFn: () => suppliersApi.getPending(),
    enabled: user?.role === 'SUPERVISOR' || user?.role === 'ADMIN',
  });

  const isLoading =
    loadingSuppliers || loadingProducts || loadingQuestionnaires || loadingAssignments;

  if (isLoading) {
    return <LoadingSpinner tip="Loading dashboard data..." />;
  }

  const role = user?.role;

  // Compute stats
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter((a) => a.status === 'SUBMITTED').length;
  const pendingAssignments = assignments.filter((a) => a.status !== 'SUBMITTED').length;
  const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

  return (
    <div>
      {/* Welcome Header */}
      <div
        style={{
          background: '#fff',
          padding: isMobile ? '16px 14px' : '24px 28px',
          borderRadius: 10,
          marginBottom: isMobile ? 16 : 24,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#0f172a' }}>
            Welcome back, {user?.firstName} {user?.lastName}!
          </Title>
          <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 14 }}>
            {role !== 'SUPPLIER' && 'Organization Compliance Command — Audit campaigns, supplier reviews, and question analytics.'}
            {role === 'SUPPLIER' && `Supplier Portal: ${user?.supplier?.companyName || 'Registered Facility'} — Complete audits and manage certified products.`}
          </Paragraph>
        </div>

        <Space wrap style={{ width: isMobile ? '100%' : 'auto' }}>
          {role !== 'SUPPLIER' && (
            <>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/questionnaires', { state: { openCreateModal: true } })}
                block={isMobile}
              >
                Create Questionnaire
              </Button>
              <Button icon={<AuditOutlined />} onClick={() => navigate('/assignments')} block={isMobile}>
                Assign Audit
              </Button>
            </>
          )}

          {role === 'SUPPLIER' && (
            <Button type="primary" icon={<AuditOutlined />} onClick={() => navigate('/my-assignments')} block={isMobile}>
              Go to My Audits
            </Button>
          )}
        </Space>
      </div>

      {/* Pending Suppliers Alert for Supervisors */}
      {(role === 'SUPERVISOR' || role === 'ADMIN') && pendingSuppliers.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${pendingSuppliers.length} Pending Supplier Registration${pendingSuppliers.length === 1 ? '' : 's'}`}
          description={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              <span>New vendor registrations are awaiting supervisor review and approval before they can access audit checklists.</span>
              <Button size="small" type="primary" onClick={() => navigate('/suppliers/pending')}>
                Review Registrations
              </Button>
            </div>
          }
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {role !== 'SUPPLIER' && (
          <>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 13 }}>Assigned Questionnaires</Text>}
                  value={questionnaires.filter((q) => q.status === 'ASSIGNED').length}
                  prefix={<FormOutlined style={{ color: '#1677ff', marginRight: 8 }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 13 }}>Total Assignments</Text>}
                  value={totalAssignments}
                  prefix={<AuditOutlined style={{ color: '#722ed1', marginRight: 8 }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 13 }}>Submitted Responses</Text>}
                  value={completedAssignments}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 13 }}>Monitored Suppliers</Text>}
                  value={suppliers.length}
                  prefix={<ShopOutlined style={{ color: '#13c2c2', marginRight: 8 }} />}
                />
              </Card>
            </Col>
          </>
        )}

        {role === 'SUPPLIER' && (
          <>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 13 }}>Assigned Audits</Text>}
                  value={totalAssignments}
                  prefix={<AuditOutlined style={{ color: '#1677ff', marginRight: 8 }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 13 }}>Pending Action</Text>}
                  value={pendingAssignments}
                  prefix={<ClockCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 13 }}>Submitted Audits</Text>}
                  value={completedAssignments}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 13 }}>Registered Products</Text>}
                  value={products.length}
                  prefix={<AppstoreOutlined style={{ color: '#fa8c16', marginRight: 8 }} />}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      {/* Progress & Overview Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title={role === 'SUPPLIER' ? 'My Actionable Audits' : 'Recent Questionnaire Assignments'}
            extra={
              <Button
                type="link"
                onClick={() => navigate(role === 'SUPPLIER' ? '/my-assignments' : '/assignments')}
              >
                View All <ArrowRightOutlined />
              </Button>
            }
            bordered={false}
            style={{ borderRadius: 8 }}
          >
            <Table
              dataSource={assignments.slice(0, 5)}
              rowKey="id"
              pagination={false}
              size="middle"
              scroll={{ x: 'max-content' }}
              locale={{
                emptyText: (
                  <EmptyState
                    title={role === 'SUPPLIER' ? 'No Audits Assigned' : 'No Recent Assignments'}
                    description={
                      role === 'SUPPLIER'
                        ? 'Your facility is up to date! There are currently no pending audits assigned to your company.'
                        : 'No questionnaires have been dispatched yet. Assign an audit to start gathering compliance evidence.'
                    }
                    actionText={role !== 'SUPPLIER' ? 'Assign Audit' : undefined}
                    onAction={role !== 'SUPPLIER' ? () => navigate('/assignments') : undefined}
                  />
                ),
              }}
              columns={[
                {
                  title: 'Questionnaire',
                  key: 'questionnaire',
                  render: (_, record) => (
                    <div>
                      <Text strong style={{ color: '#1e293b' }}>
                        {record.questionnaire?.title || 'Audit Questionnaire'}
                      </Text>
                      {record.product && (
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          Product: {record.product.name}
                        </div>
                      )}
                    </div>
                  ),
                },
                ...(role !== 'SUPPLIER'
                  ? [
                      {
                        title: 'Supplier',
                        key: 'supplier',
                        render: (_: any, record: any) => record.supplier?.companyName || '—',
                      },
                    ]
                  : []),
                {
                  title: 'Status',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => <StatusBadge status={status} />,
                },
                {
                  title: 'Action',
                  key: 'action',
                  render: (_, record) => (
                    <Button
                      type={record.status === 'SUBMITTED' ? 'default' : 'primary'}
                      size="small"
                      onClick={() => {
                        if (role === 'SUPPLIER') {
                          navigate(`/assignments/${record.id}/complete`);
                        } else {
                          navigate('/responses');
                        }
                      }}
                    >
                      {record.status === 'SUBMITTED' ? 'View' : 'Open'}
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title="Compliance Completion Rate"
            bordered={false}
            style={{ borderRadius: 8, height: '100%' }}
          >
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Progress
                type="circle"
                percent={completionRate}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                size={140}
              />
              <div style={{ marginTop: 20 }}>
                <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                  {completedAssignments} of {totalAssignments} assignments submitted
                </Text>
              </div>
            </div>

            <div style={{ marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">Pending Action</Text>
                <Tag color="gold">{pendingAssignments}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Completed</Text>
                <Tag color="green">{completedAssignments}</Tag>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
