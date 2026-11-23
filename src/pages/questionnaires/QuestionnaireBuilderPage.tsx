import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Tag,
  Divider,
  Tabs,
  message,
  Alert,
  Tooltip,
  Modal,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  SaveOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EditOutlined,
  DeleteOutlined,
  BranchesOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
  CopyOutlined,
  LockOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionnairesApi } from '../../api/questionnaires';
import { Question, QuestionOption, Answer } from '../../types';
import { QuestionFormModal } from '../../components/questionnaire/QuestionFormModal';
import { DynamicQuestionRenderer } from '../../components/questionnaire/DynamicQuestionRenderer';
import {
  getVisibleQuestions,
  getIncomingFollowUpTargets,
  detectCycle,
  getChainQuestionIds,
} from '../../utils/conditionalLogic';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useIsMobile } from '../../hooks/useIsMobile';

const { Title, Text, Paragraph } = Typography;

export const QuestionnaireBuilderPage: React.FC = () => {
  const isMobile = useIsMobile();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form] = Form.useForm();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeModal, setActiveModal] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [followUpContext, setFollowUpContext] = useState<{
    parentQuestionId: string;
    optionId: string;
    optionLabel: string;
  } | null>(null);

  // Accordion state: records which option is expanded for a given questionId
  const [expandedOptionByQuestion, setExpandedOptionByQuestion] = useState<Record<string, string | null>>({});

  // Simulator answers state
  const [simulatedAnswers, setSimulatedAnswers] = useState<Record<string, Partial<Answer>>>({});

  const { data: existingQuestionnaire, isLoading } = useQuery({
    queryKey: ['questionnaire', id],
    queryFn: () => questionnairesApi.getById(id!),
    enabled: isEditing,
  });

  const isAssigned = existingQuestionnaire?.status === 'ASSIGNED';

  useEffect(() => {
    if (existingQuestionnaire) {
      form.setFieldsValue({
        title: existingQuestionnaire.title,
        description: existingQuestionnaire.description,
      });
      setQuestions(existingQuestionnaire.questions || []);
    }
  }, [existingQuestionnaire, form]);

  const cloneMutation = useMutation({
    mutationFn: (targetId: string) => questionnairesApi.clone(targetId),
    onSuccess: (newQ) => {
      message.success(`Questionnaire cloned successfully as draft: "${newQ.title}"`);
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      navigate(`/questionnaires/${newQ.id}/edit`);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || err?.message || 'Failed to clone questionnaire');
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const values = await form.validateFields();
      let targetId = id;

      if (!isEditing) {
        const createdQ = await questionnairesApi.create({
          title: values.title.trim(),
          description: values.description?.trim(),
          status: 'DRAFT',
        });
        targetId = createdQ.id;

        // Map temporary question IDs to database IDs
        const idMap: Record<string, string> = {};

        // 1. Create questions
        for (const q of questions) {
          const resQ = await questionnairesApi.createQuestion(targetId, {
            text: q.text,
            type: q.type,
            isRequired: q.isRequired,
            order: q.order,
          });
          idMap[q.id] = resQ.id;
        }

        // 2. Create options for questions with resolved followUpQuestionId
        for (const q of questions) {
          const realQId = idMap[q.id];
          if (q.options && q.options.length > 0 && realQId) {
            for (const opt of q.options) {
              const followUpId = opt.followUpQuestionId
                ? idMap[opt.followUpQuestionId] || opt.followUpQuestionId
                : undefined;
              await questionnairesApi.createOption(targetId, realQId, {
                label: opt.label,
                value: opt.value,
                order: opt.order,
                followUpQuestionId: followUpId,
              });
            }
          }
        }
      } else {
        // Updating existing questionnaire (DRAFT)
        await questionnairesApi.update(targetId!, {
          title: values.title.trim(),
          description: values.description?.trim(),
        });

        const existingQuestions = existingQuestionnaire?.questions || [];
        const existingQIds = new Set(existingQuestions.map((eq) => eq.id));
        const currentQIds = new Set(questions.map((q) => q.id));

        // Delete removed questions
        for (const eq of existingQuestions) {
          if (!currentQIds.has(eq.id)) {
            await questionnairesApi.deleteQuestion(targetId!, eq.id);
          }
        }

        const idMap: Record<string, string> = {};

        // Create new questions or update existing ones
        for (const q of questions) {
          if (existingQIds.has(q.id)) {
            await questionnairesApi.updateQuestion(targetId!, q.id, {
              text: q.text,
              type: q.type,
              isRequired: q.isRequired,
              order: q.order,
            });
            idMap[q.id] = q.id;
          } else {
            const resQ = await questionnairesApi.createQuestion(targetId!, {
              text: q.text,
              type: q.type,
              isRequired: q.isRequired,
              order: q.order,
            });
            idMap[q.id] = resQ.id;
          }
        }

        // Sync options
        for (const q of questions) {
          const realQId = idMap[q.id] || q.id;
          const originalQ = existingQuestions.find((eq) => eq.id === q.id);
          const originalOpts = originalQ?.options || [];
          const originalOptIds = new Set(originalOpts.map((o) => o.id));
          const currentOpts = q.options || [];
          const currentOptIds = new Set(currentOpts.map((o) => o.id));

          // Delete removed options
          for (const origOpt of originalOpts) {
            if (!currentOptIds.has(origOpt.id)) {
              await questionnairesApi.deleteOption(targetId!, realQId, origOpt.id);
            }
          }

          // Create or update options
          for (const opt of currentOpts) {
            const followUpId = opt.followUpQuestionId
              ? idMap[opt.followUpQuestionId] || opt.followUpQuestionId
              : undefined;

            if (originalOptIds.has(opt.id)) {
              await questionnairesApi.updateOption(targetId!, realQId, opt.id, {
                label: opt.label,
                value: opt.value,
                order: opt.order,
                followUpQuestionId: followUpId,
              });
            } else {
              await questionnairesApi.createOption(targetId!, realQId, {
                label: opt.label,
                value: opt.value,
                order: opt.order,
                followUpQuestionId: followUpId,
              });
            }
          }
        }
      }

      return targetId;
    },
    onSuccess: () => {
      message.success('Questionnaire saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      queryClient.invalidateQueries({ queryKey: ['questionnaire', id] });
      navigate('/questionnaires');
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        message.error('A questionnaire with this title already exists. Please choose a unique name.');
      } else {
        message.error(err?.response?.data?.message || err?.message || 'Failed to save questionnaire');
      }
    },
  });

  if (isLoading) {
    return <LoadingSpinner tip="Loading questionnaire builder..." />;
  }

  const handleOpenAddQuestion = () => {
    if (isAssigned) return;
    setFollowUpContext(null);
    setEditingQuestion(null);
    setActiveModal(true);
  };

  const handleOpenAddFollowUp = (
    parentQuestionId: string,
    optionId: string,
    optionLabel: string
  ) => {
    if (isAssigned) return;
    setFollowUpContext({ parentQuestionId, optionId, optionLabel });
    setEditingQuestion(null);
    setActiveModal(true);
  };

  const handleOpenEditQuestion = (q: Question) => {
    if (isAssigned) return;
    setFollowUpContext(null);
    setEditingQuestion(q);
    setActiveModal(true);
  };

  const handleToggleExpand = (questionId: string, optionId: string) => {
    setExpandedOptionByQuestion((prev) => ({
      ...prev,
      [questionId]: prev[questionId] === optionId ? null : optionId,
    }));
  };

  const handleSaveQuestion = (qData: Partial<Question>) => {
    if (isAssigned) return;

    if (followUpContext) {
      // 1. Adding a follow-up question directly connected to a specific option
      const newQId = `ques-${Math.random().toString(36).substring(2, 9)}`;
      const newQuestion: Question = {
        id: newQId,
        text: qData.text || '',
        type: qData.type || 'TEXT',
        isRequired: qData.isRequired ?? true,
        order: questions.length + 1,
        questionnaireId: id || 'temp',
        options: (qData.options || []) as QuestionOption[],
      };

      setQuestions((prev) => {
        const updated = prev.map((q) => {
          if (q.id === followUpContext.parentQuestionId) {
            return {
              ...q,
              options: (q.options || []).map((opt) =>
                opt.id === followUpContext.optionId
                  ? { ...opt, followUpQuestionId: newQId }
                  : opt
              ),
            };
          }
          return q;
        });
        return [...updated, newQuestion];
      });

      // Auto-expand this option so the user immediately sees the newly connected follow-up question
      setExpandedOptionByQuestion((prev) => ({
        ...prev,
        [followUpContext.parentQuestionId]: followUpContext.optionId,
      }));

      setFollowUpContext(null);
      setActiveModal(false);
      message.success('Follow-up question created and linked successfully!');
      return;
    }

    if (editingQuestion) {
      // 2. Update existing question
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === editingQuestion.id
            ? { ...item, ...qData, options: qData.options as QuestionOption[] }
            : item
        )
      );
      setEditingQuestion(null);
      setActiveModal(false);
      message.success('Question updated successfully.');
      return;
    }

    // 3. Add new top-level root question
    const newQuestion: Question = {
      id: `ques-${Math.random().toString(36).substring(2, 9)}`,
      text: qData.text || '',
      type: qData.type || 'TEXT',
      isRequired: qData.isRequired ?? true,
      order: questions.length + 1,
      questionnaireId: id || 'temp',
      options: (qData.options || []) as QuestionOption[],
    };
    setQuestions((prev) => [...prev, newQuestion]);
    setActiveModal(false);
    message.success('Question added successfully.');
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (isAssigned) return;
    const chainIds = getChainQuestionIds(questionId, questions);
    const followUpCount = chainIds.length - 1;

    if (followUpCount > 0) {
      const content =
        followUpCount === 1
          ? 'This question has 1 follow-up question attached to its options. Deleting it will permanently remove this question and its follow-up question from the questionnaire. Are you sure you want to proceed?'
          : `This question has ${followUpCount} follow-up questions attached to its options. Deleting it will permanently remove this question and all ${followUpCount} of its follow-up questions from the questionnaire. Are you sure you want to proceed?`;

      Modal.confirm({
        title: 'Delete Question & Follow-up Questions?',
        content,
        okText: 'Delete Question & Follow-ups',
        okType: 'danger',
        onOk: () => {
          const chainSet = new Set(chainIds);
          setQuestions((prev) =>
            prev
              .filter((q) => !chainSet.has(q.id))
              .map((q) => ({
                ...q,
                options: (q.options || []).map((opt) =>
                  opt.followUpQuestionId && chainSet.has(opt.followUpQuestionId)
                    ? { ...opt, followUpQuestionId: null }
                    : opt
                ),
              }))
              .map((q, idx) => ({ ...q, order: idx + 1 }))
          );
          message.success('Question and follow-up questions deleted.');
        },
      });
    } else {
      setQuestions((prev) =>
        prev
          .filter((q) => q.id !== questionId)
          .map((q) => ({
            ...q,
            options: (q.options || []).map((opt) =>
              opt.followUpQuestionId === questionId ? { ...opt, followUpQuestionId: null } : opt
            ),
          }))
          .map((q, idx) => ({ ...q, order: idx + 1 }))
      );
      message.success('Question deleted.');
    }
  };

  const incomingTargets = getIncomingFollowUpTargets(questions);
  const rootQuestions = questions.filter((q) => !incomingTargets.has(q.id));

  const handleMoveRoot = (rootIndex: number, direction: 'up' | 'down') => {
    if (isAssigned) return;
    const targetRootIndex = direction === 'up' ? rootIndex - 1 : rootIndex + 1;
    if (targetRootIndex < 0 || targetRootIndex >= rootQuestions.length) return;

    const sourceRoot = rootQuestions[rootIndex];
    const targetRoot = rootQuestions[targetRootIndex];

    const sourceIdx = questions.findIndex((q) => q.id === sourceRoot.id);
    const targetIdx = questions.findIndex((q) => q.id === targetRoot.id);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const reordered = [...questions];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    setQuestions(reordered.map((q, idx) => ({ ...q, order: idx + 1 })));
  };
  const cycleInfo = detectCycle(questions);
  const visibleSimulatedQuestions = getVisibleQuestions(questions, simulatedAnswers);

  const handleSimulatedAnswerChange = (questionId: string, updates: Partial<Answer>) => {
    setSimulatedAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...updates },
    }));
  };

  const FOLLOW_UP_THEMES = [
    {
      bg: '#f0f7ff',
      border: '1px solid #bfdbfe',
      borderLeft: '4px solid #1677ff',
      tagColor: 'blue',
    },
    {
      bg: '#faf5ff',
      border: '1px solid #e9d5ff',
      borderLeft: '4px solid #9333ea',
      tagColor: 'purple',
    },
    {
      bg: '#f0fdfa',
      border: '1px solid #99f6e4',
      borderLeft: '4px solid #0d9488',
      tagColor: 'cyan',
    },
    {
      bg: '#fffbeb',
      border: '1px solid #fde68a',
      borderLeft: '4px solid #d97706',
      tagColor: 'gold',
    },
  ];

  const renderQuestionCard = (
    q: Question,
    indexLabel: string,
    level: number = 0,
    rootIndex?: number
  ) => {
    const isRoot = level === 0;
    const theme = isRoot ? null : FOLLOW_UP_THEMES[(level - 1) % FOLLOW_UP_THEMES.length];
    const activeExpandedOptId = expandedOptionByQuestion[q.id];

    const activeOpt = (q.options || []).find((opt) => opt.id === activeExpandedOptId);
    const targetQ = activeOpt && activeOpt.followUpQuestionId
      ? questions.find((item) => item.id === activeOpt.followUpQuestionId)
      : null;

    return (
      <React.Fragment key={q.id}>
        <Card
          style={{
            borderRadius: 8,
            border: isRoot ? '1px solid #e2e8f0' : theme!.border,
            borderLeft: isRoot ? '1px solid #e2e8f0' : theme!.borderLeft,
            background: isRoot ? '#ffffff' : theme!.bg,
            boxShadow: isRoot ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
            marginBottom: 14,
          }}
          styles={{ body: { padding: isMobile ? '12px 10px' : '16px 20px' } }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Badges row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <Tag color={isRoot ? 'default' : theme!.tagColor} style={{ fontWeight: 700 }}>
                  {indexLabel}
                </Tag>
                <Tag color="geekblue">{q.type}</Tag>
                {q.isRequired ? (
                  <Tag color="red">Required</Tag>
                ) : (
                  <Tag color="default">Optional</Tag>
                )}
                {!isRoot && (
                  <Tag color={theme!.tagColor} icon={<BranchesOutlined />}>
                    Follow-up Question
                  </Tag>
                )}
              </div>

              {/* Question text */}
              <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
                {q.text}
              </Text>

              {/* Options breakdown */}
              {(q.options || []).length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8, fontWeight: 600 }}>
                    Choice Options:
                  </Text>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    {q.options?.map((opt) => {
                      const hasFollowUp = !!opt.followUpQuestionId;
                      const isExpanded = activeExpandedOptId === opt.id;

                      return (
                        <div
                          key={opt.id}
                          style={{
                            flex: isMobile ? '0 0 calc(50% - 4px)' : '0 0 calc((100% - 48px) / 7)',
                            maxWidth: isMobile ? 'calc(50% - 4px)' : 'calc((100% - 48px) / 7)',
                            boxSizing: 'border-box',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '4px 6px 4px 8px',
                            borderRadius: 6,
                            background: isExpanded ? '#eff6ff' : '#f8fafc',
                            border: isExpanded ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                            boxShadow: isExpanded ? '0 0 0 2px rgba(37, 99, 235, 0.15)' : 'none',
                            height: 36,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <Tooltip
                            title={opt.label}
                            trigger={['hover', 'click']}
                            placement="top"
                          >
                            <span
                              style={{
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: 13,
                                fontWeight: isExpanded ? 600 : 500,
                                color: isExpanded ? '#1d4ed8' : '#334155',
                                cursor: 'pointer',
                                userSelect: 'none',
                              }}
                            >
                              {opt.label}
                            </span>
                          </Tooltip>

                          {!isAssigned && (
                            !hasFollowUp ? (
                              <Tooltip title={`Add follow-up question for "${opt.label}"`}>
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<PlusOutlined style={{ fontSize: 12, color: '#64748b' }} />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAddFollowUp(q.id, opt.id, opt.label);
                                  }}
                                  style={{
                                    width: 22,
                                    height: 22,
                                    padding: 0,
                                    marginLeft: 4,
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 4,
                                  }}
                                />
                              </Tooltip>
                            ) : (
                              <Tooltip title={isExpanded ? 'Collapse follow-up question' : 'View follow-up question'}>
                                <Button
                                  type={isExpanded ? 'primary' : 'text'}
                                  size="small"
                                  icon={
                                    isExpanded ? (
                                      <UpOutlined style={{ fontSize: 11 }} />
                                    ) : (
                                      <DownOutlined style={{ fontSize: 11, color: '#2563eb' }} />
                                    )
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleExpand(q.id, opt.id);
                                  }}
                                  style={{
                                    width: 22,
                                    height: 22,
                                    padding: 0,
                                    marginLeft: 4,
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 4,
                                  }}
                                />
                              </Tooltip>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons on card top-right */}
            {!isAssigned && (
              <Space size={4}>
                {isRoot && rootIndex !== undefined && (
                  <>
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={rootIndex === 0}
                      onClick={() => handleMoveRoot(rootIndex, 'up')}
                    />
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={rootIndex === rootQuestions.length - 1}
                      onClick={() => handleMoveRoot(rootIndex, 'down')}
                    />
                  </>
                )}
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleOpenEditQuestion(q)}
                />
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteQuestion(q.id)}
                />
              </Space>
            )}
          </div>
        </Card>

        {/* Follow-up question right below parent question with no indent */}
        {targetQ && renderQuestionCard(targetQ, `${indexLabel} ↳`, level + 1)}
      </React.Fragment>
    );
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          {isAssigned ? (
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/questionnaires')}>
              Back
            </Button>
          ) : (
            <Popconfirm
              title="Discard Questionnaire Changes?"
              description="Are you sure you want to discard changes and return to questionnaires?"
              onConfirm={() => navigate('/questionnaires')}
              okText="Discard"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button icon={<ArrowLeftOutlined />}>
                Back
              </Button>
            </Popconfirm>
          )}
          <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#0f172a' }}>
            {isAssigned
              ? 'View Questionnaire'
              : isEditing
              ? 'Edit Draft Questionnaire'
              : 'Create Questionnaire'}
          </Title>
          {existingQuestionnaire && (
            <Tag color={isAssigned ? 'blue' : 'warning'} icon={isAssigned ? <LockOutlined /> : undefined}>
              {existingQuestionnaire.status}
            </Tag>
          )}
        </Space>

        <Space wrap>
          {isAssigned ? (
            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={() => cloneMutation.mutate(id!)}
              loading={cloneMutation.isPending}
              style={{ background: '#08979c', borderColor: '#08979c' }}
            >
              Clone Questionnaire
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={cycleInfo.hasCycle}
            >
              Save Questionnaire
            </Button>
          )}
        </Space>
      </div>

      {/* Immutability Alert Banner */}
      {isAssigned && (
        <Alert
          type="warning"
          showIcon
          icon={<LockOutlined />}
          message="Locked / Assigned — Content is immutable"
          description="This questionnaire has been assigned to suppliers. Questions, options, and conditional branching are strictly locked to protect audit data integrity. To make modifications, use the 'Clone Questionnaire' button to create an independent editable draft."
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      {cycleInfo.hasCycle && (
        <Alert
          type="error"
          showIcon
          message="Invalid Branching: Circular Dependency"
          description="A loop was detected among follow-up questions. Saving is disabled until circular connections are resolved."
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Basic Metadata Card */}
      <Card bordered={false} style={{ borderRadius: 8, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Questionnaire Title"
            rules={[{ required: true, message: 'Please provide a unique title' }]}
          >
            <Input
              size="large"
              placeholder="e.g. ISO 9001 & Electrical Appliance Safety Audit (2026)"
              style={{ fontWeight: 600 }}
              disabled={isAssigned}
            />
          </Form.Item>

          <Form.Item name="description" label="Instructions & Purpose">
            <Input.TextArea
              rows={2}
              placeholder="Detail the scope of this audit, standards referenced, and required documentation..."
              disabled={isAssigned}
            />
          </Form.Item>
        </Form>
      </Card>

      {/* Tabs: Builder vs Live Interactive Preview */}
      <Tabs
        defaultActiveKey="builder"
        items={[
          {
            key: 'builder',
            label: (
              <span>
                <BranchesOutlined /> Questionnaire Builder
              </span>
            ),
            children: (
              <div>
                {/* Stats Bar */}
                <div
                  style={{
                    display: 'flex',
                    gap: 24,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    padding: '10px 16px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    marginBottom: 14,
                    fontSize: 13,
                    color: '#475569',
                  }}
                >
                  <div>
                    <strong style={{ color: '#0f172a' }}>Root Questions (Always Visible):</strong>{' '}
                    {rootQuestions.length}
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a' }}>Follow-up Questions (Hidden Until Triggered):</strong>{' '}
                    {incomingTargets.size}
                  </div>
                </div>

                {/* Helper note & Add Question action */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <Paragraph
                    type="secondary"
                    style={{
                      margin: 0,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    Click the{' '}
                    <Button
                      size="small"
                      icon={<PlusOutlined style={{ fontSize: 11 }} />}
                      style={{
                        pointerEvents: 'none',
                        width: 22,
                        height: 22,
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'default',
                      }}
                    />{' '}
                    next to a question option to add a follow-up question, or click the{' '}
                    <Button
                      size="small"
                      icon={<DownOutlined style={{ fontSize: 11 }} />}
                      style={{
                        pointerEvents: 'none',
                        width: 22,
                        height: 22,
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'default',
                      }}
                    />{' '}
                    to view its existing follow-up questions.
                  </Paragraph>

                  {!isAssigned && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddQuestion}>
                      Add Question
                    </Button>
                  )}
                </div>

                {rootQuestions.length === 0 ? (
                  <Card style={{ textAlign: 'center', padding: '40px 0', borderRadius: 8 }}>
                    <Paragraph type="secondary" style={{ margin: 0 }}>
                      No questions added yet. Click <strong>Add Question</strong> to define your first audit item.
                    </Paragraph>
                  </Card>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {rootQuestions.map((q, idx) =>
                      renderQuestionCard(q, `#${idx + 1}`, 0, idx)
                    )}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'preview',
            label: (
              <span>
                <EyeOutlined /> Preview
              </span>
            ),
            children: (
              <Card
                bordered={false}
                style={{ borderRadius: 8, background: '#fafbfc' }}
              >
                <div style={{ marginBottom: 20 }}>
                  <Title level={4} style={{ margin: 0 }}>
                    {form.getFieldValue('title') || 'Untitled Questionnaire'}
                  </Title>
                  <Paragraph type="secondary">
                    Test the dynamic conditional engine as a supplier would see it. Answer questions below to test how follow-ups dynamically appear and vanish.
                  </Paragraph>
                  <Button size="small" onClick={() => setSimulatedAnswers({})}>
                    Clear Simulator Answers
                  </Button>
                </div>

                <Divider style={{ margin: '16px 0' }} />

                {visibleSimulatedQuestions.length === 0 ? (
                  <Paragraph type="secondary">Add questions to test in the simulator.</Paragraph>
                ) : (
                  <div>
                    {visibleSimulatedQuestions.map((q, idx) => (
                      <DynamicQuestionRenderer
                        key={q.id}
                        question={q}
                        index={idx + 1}
                        answer={simulatedAnswers[q.id]}
                        onChange={handleSimulatedAnswerChange}
                        isFollowUp={incomingTargets.has(q.id)}
                      />
                    ))}
                  </div>
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* Question Form Modal */}
      {!isAssigned && (
        <QuestionFormModal
          visible={activeModal}
          question={editingQuestion}
          existingQuestions={questions}
          title={
            followUpContext
              ? `Add Follow-up Question for "${followUpContext.optionLabel}"`
              : editingQuestion
              ? 'Edit Question'
              : 'Add Question'
          }
          onCancel={() => {
            setActiveModal(false);
            setFollowUpContext(null);
            setEditingQuestion(null);
          }}
          onSave={handleSaveQuestion}
        />
      )}
    </div>
  );
};
