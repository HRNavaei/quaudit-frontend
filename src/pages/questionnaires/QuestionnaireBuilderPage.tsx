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
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionnairesApi } from '../../api/questionnaires';
import { Question, QuestionOption, Answer } from '../../types';
import { QuestionFormModal } from '../../components/questionnaire/QuestionFormModal';
import { ConditionalFlowPreview } from '../../components/questionnaire/ConditionalFlowPreview';
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

  const handleDeleteFollowUpChain = (
    parentQuestionId: string,
    optionId: string,
    followUpQuestionId: string
  ) => {
    if (isAssigned) return;
    const chainIds = getChainQuestionIds(followUpQuestionId, questions);
    const count = chainIds.length;
    const title = count === 1 ? 'Delete Follow-up Question?' : 'Delete Follow-up Questions?';
    const content =
      count === 1
        ? 'This option has 1 follow-up question. Deleting it will permanently remove that follow-up question from the questionnaire. Are you sure you want to proceed?'
        : `This option has ${count} follow-up questions. Deleting it will permanently remove those ${count} follow-up questions from the questionnaire. Are you sure you want to proceed?`;
    const okText = count === 1 ? 'Delete Follow-up Question' : `Delete All ${count} Follow-up Questions`;

    Modal.confirm({
      title,
      content,
      okText,
      okType: 'danger',
      onOk: () => {
        const chainSet = new Set(chainIds);
        setQuestions((prev) =>
          prev
            .filter((q) => !chainSet.has(q.id))
            .map((q) => {
              if (q.id === parentQuestionId) {
                return {
                  ...q,
                  options: (q.options || []).map((opt) =>
                    opt.id === optionId ? { ...opt, followUpQuestionId: null } : opt
                  ),
                };
              }
              return q;
            })
            .map((q, idx) => ({ ...q, order: idx + 1 }))
        );
        setExpandedOptionByQuestion((prev) => {
          const next = { ...prev };
          delete next[parentQuestionId];
          return next;
        });
        message.success(
          count === 1 ? 'Follow-up question deleted.' : `${count} follow-up questions deleted.`
        );
      },
    });
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

  const renderQuestionCard = (
    q: Question,
    indexLabel: string,
    level: number = 0,
    rootIndex?: number
  ) => {
    const isRoot = level === 0;
    const activeExpandedOptId = expandedOptionByQuestion[q.id];

    return (
      <Card
        key={q.id}
        style={{
          borderRadius: 8,
          border: isRoot ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
          borderLeft: isRoot ? '1px solid #e2e8f0' : '4px solid #1677ff',
          background: isRoot ? '#ffffff' : level % 2 === 1 ? '#f8faff' : '#f0f7ff',
          boxShadow: isRoot ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
          marginBottom: 14,
        }}
        styles={{ body: { padding: isMobile ? '12px 10px' : '16px 20px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <Tag color={isRoot ? 'default' : 'blue'} style={{ fontWeight: 700 }}>
                {indexLabel}
              </Tag>
              <Tag color="geekblue">{q.type}</Tag>
              {q.isRequired ? (
                <Tag color="red">Required</Tag>
              ) : (
                <Tag color="default">Optional</Tag>
              )}
              {!isRoot && (
                <Tag color="blue" icon={<BranchesOutlined />}>
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
                  Choice Options & Follow-up Branching:
                </Text>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options?.map((opt) => {
                    const hasFollowUp = !!opt.followUpQuestionId;
                    const isExpanded = activeExpandedOptId === opt.id;
                    const targetQ = hasFollowUp
                      ? questions.find((item) => item.id === opt.followUpQuestionId)
                      : null;

                    return (
                      <div key={opt.id}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: 6,
                            background: isExpanded ? '#eff6ff' : '#f8fafc',
                            border: isExpanded ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                            transition: 'all 0.2s ease',
                            flexWrap: 'wrap',
                            gap: 8,
                          }}
                        >
                          {/* Option info */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                fontWeight: isExpanded ? 700 : 500,
                                color: isExpanded ? '#1d4ed8' : '#1e293b',
                              }}
                            >
                              • {opt.label}
                            </span>
                            {hasFollowUp && (
                              <Tag color={isExpanded ? 'blue' : 'default'} style={{ fontSize: 11, borderRadius: 10 }}>
                                {targetQ ? `Reveals: ${targetQ.text.slice(0, 32)}${targetQ.text.length > 32 ? '...' : ''}` : 'Follow-up Connected'}
                              </Tag>
                            )}
                          </div>

                          {/* Action buttons */}
                          {!isAssigned && (
                            <Space size={6}>
                              {!hasFollowUp ? (
                                <Tooltip title={`Add follow-up question when respondent selects "${opt.label}"`}>
                                  <Button
                                    type="dashed"
                                    size="small"
                                    icon={<PlusOutlined />}
                                    onClick={() => handleOpenAddFollowUp(q.id, opt.id, opt.label)}
                                    style={{ fontSize: 12 }}
                                  >
                                    Add follow-up
                                  </Button>
                                </Tooltip>
                              ) : (
                                <>
                                  <Button
                                    size="small"
                                    type={isExpanded ? 'primary' : 'default'}
                                    onClick={() => handleToggleExpand(q.id, opt.id)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      fontWeight: isExpanded ? 600 : 400,
                                      borderColor: isExpanded ? '#2563eb' : '#d9d9d9',
                                    }}
                                  >
                                    <span>{isExpanded ? 'Hide Follow-up' : 'Show Follow-up'}</span>
                                    <span
                                      style={{
                                        display: 'inline-block',
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        fontSize: 10,
                                        fontWeight: 700,
                                      }}
                                    >
                                      ▲
                                    </span>
                                  </Button>

                                  <Tooltip title="Delete this follow-up chain">
                                    <Button
                                      type="text"
                                      danger
                                      size="small"
                                      icon={<DeleteOutlined />}
                                      onClick={() => handleDeleteFollowUpChain(q.id, opt.id, opt.followUpQuestionId!)}
                                    />
                                  </Tooltip>
                                </>
                              )}
                            </Space>
                          )}
                        </div>

                        {/* Nested follow-up question below option if expanded */}
                        {hasFollowUp && isExpanded && targetQ && (
                          <div
                            style={{
                              marginTop: 10,
                              marginLeft: isMobile ? 4 : 12,
                              paddingLeft: isMobile ? 6 : 12,
                              borderLeft: '2px dashed #93c5fd',
                              animation: 'fadeIn 0.2s ease',
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                color: '#1d4ed8',
                                fontWeight: 600,
                                marginBottom: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <BranchesOutlined /> Follow-up for Option "{opt.label}":
                            </div>
                            {renderQuestionCard(targetQ, `${indexLabel} ↳`, level + 1)}
                          </div>
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
    );
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/questionnaires')}>
            Back
          </Button>
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
            <>
              <Popconfirm
                title="Discard Questionnaire Changes?"
                description="Are you sure you want to discard changes and return to questionnaires?"
                onConfirm={() => navigate('/questionnaires')}
                okText="Discard"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button danger>
                  Discard
                </Button>
              </Popconfirm>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
                disabled={cycleInfo.hasCycle}
              >
                Save Questionnaire
              </Button>
            </>
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
                <BranchesOutlined /> Question Configuration ({questions.length})
              </span>
            ),
            children: (
              <div>
                <ConditionalFlowPreview questions={questions} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 16px' }}>
                  <Title level={4} style={{ margin: 0 }}>
                    Questions Configuration
                  </Title>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                <EyeOutlined /> Live Interactive Simulator
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
