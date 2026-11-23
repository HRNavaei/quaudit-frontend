import React, { useState } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Typography,
  Popconfirm,
  Tag,
  message,
  Tooltip,
  Select,
  Input,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  BarChartOutlined,
  EyeOutlined,
  CopyOutlined,
  LockOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionnairesApi } from '../../api/questionnaires';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Questionnaire, QuestionnaireStatus } from '../../types';
import { useIsMobile } from '../../hooks/useIsMobile';

const { Title, Text, Paragraph } = Typography;

export const QuestionnaireListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchText, setSearchText] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: questionnaires = [], isLoading } = useQuery({
    queryKey: ['questionnaires'],
    queryFn: () => questionnairesApi.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => questionnairesApi.delete(id),
    onSuccess: () => {
      message.success('Draft questionnaire deleted.');
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || err?.message || 'Failed to delete questionnaire');
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => questionnairesApi.clone(id),
    onSuccess: (newQ) => {
      message.success(`Questionnaire cloned successfully as draft: "${newQ.title}"`);
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      navigate(`/questionnaires/${newQ.id}/edit`);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || err?.message || 'Failed to clone questionnaire');
    },
  });

  const filteredQuestionnaires = questionnaires.filter((q) => {
    const text = `${q.title} ${q.description || ''}`.toLowerCase();
    const matchSearch = !searchText || text.includes(searchText.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchSearch && matchStatus;
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
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            Questionnaire Management
          </Title>
          <Text type="secondary">
            Author dynamic compliance checklists, configure conditional branches, and manage audit assignments.
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/questionnaires/new')}
          style={{ height: 40 }}
          block={isMobile}
        >
          Create Questionnaire
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Input
            placeholder="Search questionnaires by title or description..."
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
              { value: 'DRAFT', label: 'Drafts Only' },
              { value: 'ASSIGNED', label: 'Assigned (Locked)' },
            ]}
          />
        </div>

        <Table
          dataSource={filteredQuestionnaires}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: (
              <EmptyState
                title="No Questionnaires Found"
                description={
                  searchText || statusFilter !== 'ALL'
                    ? 'No questionnaires match your search or filter criteria.'
                    : 'No questionnaires created yet. Start by authoring your first audit checklist.'
                }
                actionText="Create Questionnaire"
                onAction={() => navigate('/questionnaires/new')}
              />
            ),
          }}
          columns={[
            {
              title: 'Title & Summary',
              key: 'title',
              render: (_, record: Questionnaire) => (
                <div style={{ maxWidth: 360 }}>
                  <Text strong style={{ color: '#0f172a', fontSize: 14 }}>
                    {record.title}
                  </Text>
                  {record.description && (
                    <Paragraph
                      type="secondary"
                      ellipsis={{ rows: 2 }}
                      style={{ margin: '4px 0 0', fontSize: 12 }}
                    >
                      {record.description}
                    </Paragraph>
                  )}
                </div>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: QuestionnaireStatus) => (
                <Space size={4}>
                  <StatusBadge status={status} />
                  {status === 'ASSIGNED' && (
                    <Tooltip title="Assigned & Locked: Content is immutable">
                      <LockOutlined style={{ color: '#64748b', fontSize: 12 }} />
                    </Tooltip>
                  )}
                </Space>
              ),
            },
            {
              title: 'Questions',
              key: 'questionsCount',
              render: (_, record) => (
                <Tag color="cyan">{record.questions?.length || 0} Questions</Tag>
              ),
            },
            {
              title: 'Assignments & Submissions',
              key: 'stats',
              render: (_, record) => (
                <div style={{ fontSize: 13 }}>
                  <div>Assigned: <strong>{record.assignmentsCount || 0}</strong></div>
                  <div style={{ color: '#52c41a' }}>Responses: <strong>{record.responsesCount || 0}</strong></div>
                </div>
              ),
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record: Questionnaire) => {
                const isAssigned = record.status === 'ASSIGNED';
                const isDraft = record.status === 'DRAFT';
                const hasQuestions = (record.questions?.length || 0) > 0;

                return (
                  <Space size={8}>
                    <Tooltip title={isAssigned ? 'View in Builder (Read-Only)' : 'Edit in Builder'}>
                      <Button
                        type="text"
                        icon={isAssigned ? <EyeOutlined /> : <EditOutlined />}
                        onClick={() => navigate(`/questionnaires/${record.id}/edit`)}
                      >
                        {isAssigned ? 'View' : 'Edit'}
                      </Button>
                    </Tooltip>

                    {/* Assign Action */}
                    <Tooltip
                      title={
                        !hasQuestions
                          ? 'Add at least one question before assigning to suppliers'
                          : 'Assign to a supplier'
                      }
                    >
                      <Button
                        type="text"
                        icon={<SendOutlined style={{ color: hasQuestions ? '#1677ff' : '#94a3b8' }} />}
                        disabled={!hasQuestions}
                        onClick={() =>
                          navigate('/assignments', {
                            state: { assignQuestionnaireId: record.id },
                          })
                        }
                      >
                        Assign
                      </Button>
                    </Tooltip>

                    {/* Clone Action for ASSIGNED questionnaires */}
                    {isAssigned && (
                      <Tooltip title="Clone questionnaire to new editable draft">
                        <Button
                          type="text"
                          icon={<CopyOutlined style={{ color: '#08979c' }} />}
                          loading={cloneMutation.isPending && cloneMutation.variables === record.id}
                          onClick={() => cloneMutation.mutate(record.id)}
                        >
                          Clone
                        </Button>
                      </Tooltip>
                    )}

                    <Tooltip title="View Response Analytics">
                      <Button
                        type="text"
                        icon={<BarChartOutlined style={{ color: '#722ed1' }} />}
                        onClick={() => navigate('/analytics', { state: { questionnaireId: record.id } })}
                      />
                    </Tooltip>

                    {/* Delete Action only for DRAFT */}
                    {isDraft && (
                      <Popconfirm
                        title="Delete Questionnaire"
                        description="Are you sure you want to delete this draft?"
                        onConfirm={() => deleteMutation.mutate(record.id)}
                        okText="Yes, Delete"
                        cancelText="Cancel"
                      >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    )}
                  </Space>
                );
              },
            },
          ]}
        />
      </Card>
    </div>
  );
};
