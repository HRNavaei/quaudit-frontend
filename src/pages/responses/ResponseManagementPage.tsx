import React, { useState } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Select,
  Typography,
  Tag,
  Drawer,
  Descriptions,
  Popconfirm,
  message,
} from 'antd';
import {
  EyeOutlined,
  UndoOutlined,
  ShopOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { assignmentsApi } from '../../api/assignments';
import { questionnairesApi } from '../../api/questionnaires';
import { suppliersApi } from '../../api/suppliers';
import { QuestionnaireAssignment, Answer, AiAssessmentResponse } from '../../types';
import { DynamicQuestionRenderer } from '../../components/questionnaire/DynamicQuestionRenderer';
import { AiAssessmentCard } from '../../components/ai/AiAssessmentCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { getIncomingFollowUpTargets } from '../../utils/conditionalLogic';

const { Title, Text } = Typography;

export const ResponseManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSupplier = user?.role === 'SUPPLIER';
  const supplierId = user?.supplier?.id;

  const [selectedQuestionnaireFilter, setSelectedQuestionnaireFilter] = useState<string>('ALL');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('ALL');
  const [inspectedAssignment, setInspectedAssignment] = useState<QuestionnaireAssignment | null>(null);
  const [assessmentsMap, setAssessmentsMap] = useState<Record<string, AiAssessmentResponse>>({});

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments', isSupplier ? supplierId : 'all'],
    queryFn: () => assignmentsApi.getAll(isSupplier && supplierId ? { supplierId } : undefined),
  });

  const { data: questionnaires = [] } = useQuery({
    queryKey: ['questionnaires'],
    queryFn: () => questionnairesApi.getAll(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.getAll(),
    enabled: !isSupplier,
  });

  // AI Assessment mutation
  const assessmentMutation = useMutation({
    mutationFn: (id: string) => assignmentsApi.generateAiAssessment(id),
    onSuccess: (data, id) => {
      message.success('AI assessment generated successfully.');
      setAssessmentsMap((prev) => ({ ...prev, [id]: data }));
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message;
      if (status === 502) {
        message.error('AI provider failed or timed out (502 Bad Gateway). Please retry.');
      } else if (status === 503) {
        message.error('AI service is not configured on the backend (503 Service Unavailable).');
      } else if (status === 400) {
        message.error(msg || 'Assignment is not submitted yet.');
      } else if (status === 403) {
        message.error('Forbidden: Only supervisors and admins can generate AI assessments.');
      } else {
        message.error(msg || 'Failed to generate AI assessment');
      }
    },
  });

  // Re-open mutation
  const reopenMutation = useMutation({
    mutationFn: (id: string) => assignmentsApi.reopen(id),
    onSuccess: () => {
      message.success('Assignment has been re-opened for supplier revision.');
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setInspectedAssignment(null);
    },
    onError: (err: any) => {
      message.error(err?.message || 'Failed to reopen assignment');
    },
  });

  // Automatically open inspection if redirected with highlightId
  React.useEffect(() => {
    const highlightId = (location.state as any)?.highlightId;
    if (highlightId && assignments.length > 0) {
      const found = assignments.find((a) => a.id === highlightId);
      if (found) {
        setInspectedAssignment(found);
      }
    }
  }, [location.state, assignments]);

  // Only submitted responses are shown in Response Management
  const submittedResponses = assignments.filter((a) => a.status === 'SUBMITTED');

  const filteredResponses = submittedResponses.filter((a) => {
    const matchQ =
      selectedQuestionnaireFilter === 'ALL' || a.questionnaireId === selectedQuestionnaireFilter;
    const matchS =
      selectedSupplierFilter === 'ALL' || a.supplierId === selectedSupplierFilter;
    return matchQ && matchS;
  });

  // Answers map for inspected assignment
  const answersMap: Record<string, Partial<Answer>> = {};
  if (inspectedAssignment?.answers) {
    inspectedAssignment.answers.forEach((ans) => {
      answersMap[ans.questionId] = ans;
    });
  }

  const incomingTargets = inspectedAssignment?.questionnaire?.questions
    ? getIncomingFollowUpTargets(inspectedAssignment.questionnaire.questions)
    : new Set<string>();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            Response Management
          </Title>
          <Text type="secondary">
            Review completed quality audits, inspect supplier evidence, and evaluate compliance records.
          </Text>
        </div>

        {!isSupplier && (
          <Button
            type="primary"
            icon={<BarChartOutlined />}
            onClick={() => navigate('/analytics')}
            style={{ height: 40 }}
          >
            View Aggregate Analytics
          </Button>
        )}
      </div>

      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Select
            value={selectedQuestionnaireFilter}
            onChange={setSelectedQuestionnaireFilter}
            style={{ width: 280 }}
            options={[
              { value: 'ALL', label: 'All Questionnaires' },
              ...questionnaires.map((q) => ({ value: q.id, label: q.title })),
            ]}
          />

          {!isSupplier && (
            <Select
              value={selectedSupplierFilter}
              onChange={setSelectedSupplierFilter}
              style={{ width: 220 }}
              options={[
                { value: 'ALL', label: 'All Suppliers' },
                ...suppliers.map((s) => ({ value: s.id, label: s.companyName })),
              ]}
            />
          )}
        </div>

        <Table
          dataSource={filteredResponses}
          rowKey="id"
          loading={isLoading}
          columns={[
            {
              title: 'Questionnaire Title',
              key: 'questionnaire',
              render: (_, record) => (
                <div>
                  <Text strong style={{ color: '#0f172a', fontSize: 14 }}>
                    {record.questionnaire?.title}
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
              title: 'Supplier',
              key: 'supplier',
              render: (_, record) => (
                <div>
                  <ShopOutlined style={{ marginRight: 6, color: '#13c2c2' }} />
                  <Text strong>{record.supplier?.companyName}</Text>
                </div>
              ),
            },
            {
              title: 'Product Line',
              key: 'product',
              render: (_, record) =>
                record.product ? (
                  <div>
                    <AppstoreOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                    <span>{record.product.name}</span>
                  </div>
                ) : (
                  <Tag color="default">General Facility</Tag>
                ),
            },
            {
              title: 'Answers Logged',
              key: 'answers',
              render: (_, record) => (
                <Tag color="cyan">{record.answers?.length || 0} Answers</Tag>
              ),
            },
            {
              title: 'Submission Date',
              dataIndex: 'submittedAt',
              key: 'submittedAt',
              render: (date: string) => (
                <span style={{ fontSize: 13, color: '#334155' }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                  {date ? new Date(date).toLocaleString() : '—'}
                </span>
              ),
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record) => (
                <Space>
                  <Button
                    type="primary"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => setInspectedAssignment(record)}
                  >
                    Inspect Answers
                  </Button>

                  {!isSupplier && (
                    <Button
                      size="small"
                      icon={<ThunderboltOutlined style={{ color: '#6366f1' }} />}
                      loading={assessmentMutation.isPending && assessmentMutation.variables === record.id}
                      onClick={() => {
                        setInspectedAssignment(record);
                        if (!assessmentsMap[record.id]) {
                          assessmentMutation.mutate(record.id);
                        }
                      }}
                    >
                      AI Review
                    </Button>
                  )}

                  {!isSupplier && (
                    <Popconfirm
                      title="Re-open Assignment"
                      description="Allow the supplier to revise and resubmit their answers?"
                      onConfirm={() => reopenMutation.mutate(record.id)}
                    >
                      <Button size="small" icon={<UndoOutlined />}>
                        Re-open
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* Response Inspection Drawer */}
      <Drawer
        title={inspectedAssignment?.questionnaire?.title || 'Audit Response Inspection'}
        placement="right"
        width={760}
        onClose={() => setInspectedAssignment(null)}
        open={!!inspectedAssignment}
        extra={
          <Space>
            {!isSupplier && inspectedAssignment?.status === 'SUBMITTED' && (
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={assessmentMutation.isPending && assessmentMutation.variables === inspectedAssignment.id}
                disabled={assessmentMutation.isPending}
                onClick={() => assessmentMutation.mutate(inspectedAssignment.id)}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderColor: '#6366f1',
                }}
              >
                {assessmentsMap[inspectedAssignment.id]
                  ? 'Re-analyze with AI'
                  : 'Generate AI Assessment'}
              </Button>
            )}

            {!isSupplier && inspectedAssignment ? (
              <Popconfirm
                title="Re-open Assignment"
                description="Unlock this audit and return it to In Progress for supplier revision?"
                onConfirm={() => reopenMutation.mutate(inspectedAssignment.id)}
              >
                <Button icon={<UndoOutlined />}>Re-open for Supplier</Button>
              </Popconfirm>
            ) : null}
          </Space>
        }
      >
        {inspectedAssignment && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Supplier">
                <strong>{inspectedAssignment.supplier?.companyName}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Target Product">
                {inspectedAssignment.product?.name || 'General Facility Audit'}
              </Descriptions.Item>
              <Descriptions.Item label="Assigned Date">
                {new Date(inspectedAssignment.assignedAt).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="Submitted Date">
                {inspectedAssignment.submittedAt
                  ? new Date(inspectedAssignment.submittedAt).toLocaleString()
                  : '—'}
              </Descriptions.Item>
            </Descriptions>

            {/* AI Supplier Assessment Section */}
            {!isSupplier && inspectedAssignment.status === 'SUBMITTED' && (
              assessmentsMap[inspectedAssignment.id] ? (
                <AiAssessmentCard
                  assessment={assessmentsMap[inspectedAssignment.id]}
                  onRefresh={() => assessmentMutation.mutate(inspectedAssignment.id)}
                  loading={assessmentMutation.isPending && assessmentMutation.variables === inspectedAssignment.id}
                />
              ) : (
                <Card
                  bordered
                  style={{
                    marginBottom: 20,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: '1px dashed #cbd5e1',
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <Space align="center">
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: 16,
                        }}
                      >
                        <ThunderboltOutlined />
                      </div>
                      <div>
                        <Text strong style={{ color: '#0f172a' }}>
                          AI Supplier Assessment
                        </Text>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          Evaluate compliance, calculate score, and generate actionable recommendations.
                        </div>
                      </div>
                    </Space>
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      loading={assessmentMutation.isPending && assessmentMutation.variables === inspectedAssignment.id}
                      disabled={assessmentMutation.isPending}
                      onClick={() => assessmentMutation.mutate(inspectedAssignment.id)}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        borderColor: '#6366f1',
                      }}
                    >
                      {assessmentMutation.isPending && assessmentMutation.variables === inspectedAssignment.id
                        ? 'Analyzing with AI...'
                        : 'Generate AI Assessment'}
                    </Button>
                  </div>
                </Card>
              )
            )}

            <Title level={5} style={{ marginBottom: 16 }}>
              Submitted Responses Breakdown
            </Title>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(inspectedAssignment.questionnaire?.questions || []).map((q, idx) => (
                <DynamicQuestionRenderer
                  key={q.id}
                  question={q}
                  index={idx + 1}
                  answer={answersMap[q.id]}
                  readOnly={true}
                  isFollowUp={incomingTargets.has(q.id)}
                />
              ))}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
