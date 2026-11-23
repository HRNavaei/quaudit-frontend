import React from 'react';
import { Card, Row, Col, Typography, Button, Tag, Space } from 'antd';
import {
  AuditOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  AppstoreOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { assignmentsApi } from '../../api/assignments';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { useIsMobile } from '../../hooks/useIsMobile';

const { Title, Text, Paragraph } = Typography;

export const SupplierAssignmentsPage: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const supplierId = user?.supplier?.id;

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments', 'supplier', supplierId],
    queryFn: () => assignmentsApi.getAll(supplierId ? { supplierId } : undefined),
    enabled: !!supplierId,
  });

  if (isLoading) {
    return <LoadingSpinner tip="Loading your assigned audits..." />;
  }

  const pendingList = assignments.filter((a) => a.status === 'PENDING');
  const inProgressList = assignments.filter((a) => a.status === 'IN_PROGRESS');
  const submittedList = assignments.filter((a) => a.status === 'SUBMITTED');

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
          My Assigned Audits
        </Title>
        <Text type="secondary">
          Compliance questionnaires and safety audits requiring completion for your registered products.
        </Text>
      </div>

      {/* Summary counters */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 8, background: '#fffbe6', border: '1px solid #ffe58f' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>Action Required</Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#d48806' }}>
                  {pendingList.length}
                </div>
              </div>
              <ClockCircleOutlined style={{ fontSize: 28, color: '#faad14' }} />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 8, background: '#e6f4ff', border: '1px solid #91caff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>In Progress</Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0958d9' }}>
                  {inProgressList.length}
                </div>
              </div>
              <AuditOutlined style={{ fontSize: 28, color: '#1677ff' }} />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 8, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>Completed Audits</Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#389e0d' }}>
                  {submittedList.length}
                </div>
              </div>
              <CheckCircleOutlined style={{ fontSize: 28, color: '#52c41a' }} />
            </div>
          </Card>
        </Col>
      </Row>

      {assignments.length === 0 ? (
        <EmptyState
          title="No Audits Assigned"
          description="Your company currently has no pending or active questionnaire audits assigned."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {assignments.map((assignment) => {
            const q = assignment.questionnaire;
            const isPending = assignment.status === 'PENDING';
            const isInProgress = assignment.status === 'IN_PROGRESS';
            const isSubmitted = assignment.status === 'SUBMITTED';

            return (
              <Card
                key={assignment.id}
                style={{
                  borderRadius: 10,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  border: isPending ? '1px solid #ffe58f' : isInProgress ? '1px solid #91caff' : '1px solid #e2e8f0',
                }}
                styles={{ body: { padding: isMobile ? '16px 14px' : '20px 24px' } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: isMobile ? '100%' : 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                      <StatusBadge status={assignment.status} />
                      {assignment.product ? (
                        <Tag color="geekblue" icon={<AppstoreOutlined />}>
                          {assignment.product.name}
                        </Tag>
                      ) : (
                        <Tag color="default">General Facility Audit</Tag>
                      )}
                    </div>

                    <Title level={4} style={{ margin: '4px 0 8px', color: '#0f172a' }}>
                      {q?.title || 'Audit Questionnaire'}
                    </Title>

                    {q?.description && (
                      <Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
                        {q.description}
                      </Paragraph>
                    )}

                    <Space size={16} wrap style={{ fontSize: 12, color: '#64748b' }}>
                      <span>
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                      </span>
                      {assignment.submittedAt && (
                        <span style={{ color: '#52c41a' }}>
                          <CheckCircleOutlined style={{ marginRight: 4 }} />
                          Submitted: {new Date(assignment.submittedAt).toLocaleDateString()}
                        </span>
                      )}
                    </Space>
                  </div>

                  <div style={{ width: isMobile ? '100%' : 'auto', alignSelf: 'center' }}>
                    <Button
                      type={isSubmitted ? 'default' : 'primary'}
                      size="large"
                      block={isMobile}
                      onClick={() => navigate(`/assignments/${assignment.id}/complete`)}
                      style={{ minWidth: isMobile ? '100%' : 160 }}
                    >
                      {isPending && 'Start Audit'}
                      {isInProgress && 'Continue Audit'}
                      {isSubmitted && 'View Submission'}
                      <ArrowRightOutlined style={{ marginLeft: 6 }} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
