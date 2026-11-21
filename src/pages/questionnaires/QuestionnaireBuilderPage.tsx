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
  Popconfirm,
  message,
  Alert,
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
import { getVisibleQuestions, getIncomingFollowUpTargets, detectCycle } from '../../utils/conditionalLogic';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const { Title, Text, Paragraph } = Typography;

export const QuestionnaireBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form] = Form.useForm();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeModal, setActiveModal] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

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
      if (!questions || questions.length === 0) {
        message.error('A questionnaire must contain at least one question before saving.');
        throw new Error('A questionnaire must contain at least one question.');
      }
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
    setEditingQuestion(null);
    setActiveModal(true);
  };

  const handleOpenEditQuestion = (q: Question) => {
    if (isAssigned) return;
    setEditingQuestion(q);
    setActiveModal(true);
  };

  const handleSaveQuestion = (qData: Partial<Question>) => {
    if (isAssigned) return;
    if (editingQuestion) {
      // Update existing question
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === editingQuestion.id
            ? { ...item, ...qData, options: qData.options as QuestionOption[] }
            : item
        )
      );
    } else {
      // Add new question
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
    }
    setActiveModal(false);
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (isAssigned) return;
    // Remove question and clear any options pointing to it
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
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (isAssigned) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const reordered = [...questions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setQuestions(reordered.map((q, idx) => ({ ...q, order: idx + 1 })));
  };

  const incomingTargets = getIncomingFollowUpTargets(questions);
  const cycleInfo = detectCycle(questions);
  const visibleSimulatedQuestions = getVisibleQuestions(questions, simulatedAnswers);

  const handleSimulatedAnswerChange = (questionId: string, updates: Partial<Answer>) => {
    setSimulatedAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...updates },
    }));
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/questionnaires')}>
            Back
          </Button>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            {isAssigned
              ? 'View Questionnaire (Assigned)'
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

        <Space>
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

                {questions.length === 0 ? (
                  <Card style={{ textAlign: 'center', padding: '40px 0', borderRadius: 8 }}>
                    <Paragraph type="secondary">
                      No questions added yet. Click <strong>Add Question</strong> to define your first audit item.
                    </Paragraph>
                    {!isAssigned && (
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddQuestion}>
                        Add Question
                      </Button>
                    )}
                  </Card>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {questions.map((q, idx) => {
                      const isConditionalTarget = incomingTargets.has(q.id);

                      return (
                        <Card
                          key={q.id}
                          style={{
                            borderRadius: 8,
                            border: isConditionalTarget ? '1px dashed #1677ff' : '1px solid #e2e8f0',
                            background: isConditionalTarget ? '#f8faff' : '#ffffff',
                          }}
                          bodyStyle={{ padding: '16px 20px' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                                <Tag color={isConditionalTarget ? 'blue' : 'default'} style={{ fontWeight: 700 }}>
                                  #{idx + 1}
                                </Tag>
                                <Tag color="geekblue">{q.type}</Tag>
                                {q.isRequired ? (
                                  <Tag color="red">Required</Tag>
                                ) : (
                                  <Tag color="default">Optional</Tag>
                                )}
                                {isConditionalTarget && (
                                  <Tag color="blue" icon={<BranchesOutlined />}>
                                    Conditional (Follow-up)
                                  </Tag>
                                )}
                              </div>

                              <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
                                {q.text}
                              </Text>

                              {/* Options breakdown */}
                              {(q.options || []).length > 0 && (
                                <div style={{ marginTop: 12, paddingLeft: 12, borderLeft: '2px solid #e2e8f0' }}>
                                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                    Options & Branching:
                                  </Text>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {q.options?.map((opt) => {
                                      const targetQ = questions.find((item) => item.id === opt.followUpQuestionId);
                                      return (
                                        <div key={opt.id} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <span>• {opt.label}</span>
                                          {targetQ ? (
                                            <Tag color="blue" icon={<BranchesOutlined />} style={{ fontSize: 11 }}>
                                              Reveals: {targetQ.text.substring(0, 35)}...
                                            </Tag>
                                          ) : (
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                              (no follow-up)
                                            </Text>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>

                            {!isAssigned && (
                              <Space size={4}>
                                <Button
                                  size="small"
                                  icon={<ArrowUpOutlined />}
                                  disabled={idx === 0}
                                  onClick={() => handleMove(idx, 'up')}
                                />
                                <Button
                                  size="small"
                                  icon={<ArrowDownOutlined />}
                                  disabled={idx === questions.length - 1}
                                  onClick={() => handleMove(idx, 'down')}
                                />
                                <Button
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={() => handleOpenEditQuestion(q)}
                                />
                                <Popconfirm
                                  title="Delete Question"
                                  description="Are you sure you want to remove this question?"
                                  onConfirm={() => handleDeleteQuestion(q.id)}
                                >
                                  <Button size="small" danger icon={<DeleteOutlined />} />
                                </Popconfirm>
                              </Space>
                            )}
                          </div>
                        </Card>
                      );
                    })}
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
          onCancel={() => setActiveModal(false)}
          onSave={handleSaveQuestion}
        />
      )}
    </div>
  );
};
