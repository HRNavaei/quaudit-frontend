import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Progress,
  Alert,
  Modal,
  message,
  Tag,
  Descriptions,
} from 'antd';
import {
  SaveOutlined,
  SendOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  AppstoreOutlined,
  ShopOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi } from '../../api/assignments';
import { DynamicQuestionRenderer } from '../../components/questionnaire/DynamicQuestionRenderer';
import { AiAssessmentCard } from '../../components/ai/AiAssessmentCard';
import { getVisibleQuestions, getIncomingFollowUpTargets } from '../../utils/conditionalLogic';
import { Answer, Question, AnswerItemDto, AiAssessmentResponse } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const { Title, Text, Paragraph } = Typography;

export const QuestionnaireCompletionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [answers, setAnswers] = useState<Record<string, Partial<Answer>>>({});
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState<boolean>(false);
  const [aiAssessment, setAiAssessment] = useState<AiAssessmentResponse | null>(null);

  const { data: assignment, isLoading } = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => assignmentsApi.getById(id!),
    enabled: !!id,
  });

  // AI Assessment mutation for supervisor review
  const assessmentMutation = useMutation({
    mutationFn: (assignmentId: string) => assignmentsApi.generateAiAssessment(assignmentId),
    onSuccess: (data) => {
      message.success('AI assessment generated successfully.');
      setAiAssessment(data);
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

  // Pre-populate answers from assignment
  useEffect(() => {
    if (assignment?.answers) {
      const map: Record<string, Partial<Answer>> = {};
      assignment.answers.forEach((ans) => {
        map[ans.questionId] = ans;
      });
      setAnswers(map);
    }
  }, [assignment]);

  const saveMutation = useMutation({
    mutationFn: async (submit: boolean) => {
      const answersArray: AnswerItemDto[] = Object.values(answers)
        .filter((ans) => !!ans.questionId)
        .map((ans) => ({
          questionId: ans.questionId!,
          textValue: ans.textValue !== null && ans.textValue !== undefined ? String(ans.textValue) : undefined,
          numberValue: ans.numberValue !== null && ans.numberValue !== undefined && ans.numberValue !== ('' as any) ? Number(ans.numberValue) : undefined,
          booleanValue: ans.booleanValue !== null && ans.booleanValue !== undefined ? Boolean(ans.booleanValue) : undefined,
          selectedOptionId: ans.selectedOptionId || undefined,
        }));
      await assignmentsApi.saveAnswers(id!, answersArray);
      if (submit) {
        await assignmentsApi.submit(id!);
      }
    },
    onSuccess: (_data, submit) => {
      if (submit) {
        message.success('Audit response submitted successfully! Quality team notified.');
      } else {
        message.success('Draft responses saved successfully.');
      }
      queryClient.invalidateQueries({ queryKey: ['assignment', id] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      if (submit) {
        navigate(user?.role === 'SUPPLIER' ? '/my-assignments' : '/responses');
      }
    },
    onError: (err: any) => {
      message.error(err?.message || 'Failed to save responses');
    },
  });

  if (isLoading || !assignment) {
    return <LoadingSpinner tip="Loading dynamic questionnaire..." />;
  }

  const q = assignment.questionnaire;
  const questions: Question[] = q?.questions || [];
  const isSubmitted = assignment.status === 'SUBMITTED';
  const isSupplier = user?.role === 'SUPPLIER';

  // Compute dynamically visible questions based on active answers!
  const visibleQuestions = getVisibleQuestions(questions, answers);
  const incomingTargets = getIncomingFollowUpTargets(questions);

  // Compute completion progress across currently visible required questions
  const requiredVisibleQuestions = visibleQuestions.filter((item) => item.isRequired);
  const answeredRequiredCount = requiredVisibleQuestions.filter((item) => {
    const ans = answers[item.id];
    if (!ans) return false;
    if (item.type === 'YES_NO' || item.type === 'SINGLE_CHOICE') {
      return !!ans.selectedOptionId;
    }
    if (item.type === 'NUMBER') {
      return ans.numberValue !== null && ans.numberValue !== undefined;
    }
    if (item.type === 'TEXT') {
      return !!ans.textValue && ans.textValue.trim().length > 0;
    }
    return false;
  }).length;

  const progressPercent =
    requiredVisibleQuestions.length > 0
      ? Math.round((answeredRequiredCount / requiredVisibleQuestions.length) * 100)
      : 100;

  const handleAnswerChange = (questionId: string, updates: Partial<Answer>) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        ...updates,
      },
    }));
  };

  const handleValidateAndSubmit = () => {
    // Check if all visible required questions are answered
    const unanswered = requiredVisibleQuestions.filter((item) => {
      const ans = answers[item.id];
      if (!ans) return true;
      if (item.type === 'YES_NO' || item.type === 'SINGLE_CHOICE') return !ans.selectedOptionId;
      if (item.type === 'NUMBER') return ans.numberValue === null || ans.numberValue === undefined;
      if (item.type === 'TEXT') return !ans.textValue || ans.textValue.trim().length === 0;
      return false;
    });

    if (unanswered.length > 0) {
      message.error(
        `Please answer all mandatory questions. ${unanswered.length} required field(s) remain incomplete.`
      );
      return;
    }

    setSubmitConfirmOpen(true);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(isSupplier ? '/my-assignments' : '/assignments')}
        >
          {isSupplier ? 'Back to My Audits' : 'Back to Assignments'}
        </Button>

        <Space>
          {!isSupplier && isSubmitted && (
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={assessmentMutation.isPending}
              disabled={assessmentMutation.isPending}
              onClick={() => assessmentMutation.mutate(id!)}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                borderColor: '#6366f1',
              }}
            >
              {assessmentMutation.isPending
                ? 'Analyzing with AI...'
                : aiAssessment
                ? 'Re-analyze with AI'
                : 'Generate AI Assessment'}
            </Button>
          )}

          {!isSubmitted && (
            <>
              <Button
                icon={<SaveOutlined />}
                onClick={() => saveMutation.mutate(false)}
                loading={saveMutation.isPending}
              >
                Save Progress
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleValidateAndSubmit}
                loading={saveMutation.isPending}
              >
                Submit Audit Response
              </Button>
            </>
          )}
        </Space>
      </div>

      {/* Submitted Banner */}
      {isSubmitted && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message="Audit Submitted & Locked"
          description={`This response was submitted on ${assignment.submittedAt ? new Date(assignment.submittedAt).toLocaleString() : 'earlier'}. To make alterations, please contact your quality supervisor to re-open the audit.`}
          style={{ marginBottom: 20 }}
        />
      )}

      {/* AI Assessment Section for Supervisors */}
      {!isSupplier && isSubmitted && (
        aiAssessment ? (
          <AiAssessmentCard
            assessment={aiAssessment}
            onRefresh={() => assessmentMutation.mutate(id!)}
            loading={assessmentMutation.isPending}
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
                loading={assessmentMutation.isPending}
                disabled={assessmentMutation.isPending}
                onClick={() => assessmentMutation.mutate(id!)}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderColor: '#6366f1',
                }}
              >
                {assessmentMutation.isPending ? 'Analyzing with AI...' : 'Generate AI Assessment'}
              </Button>
            </div>
          </Card>
        )
      )}

      {/* Questionnaire Overview Card */}
      <Card
        style={{
          borderRadius: 10,
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
        bodyStyle={{ padding: '24px 28px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Tag color="cyan">Quality & Safety Audit</Tag>
        </div>

        <Title level={3} style={{ margin: '4px 0 12px', color: '#0f172a' }}>
          {q?.title}
        </Title>

        {q?.description && (
          <Paragraph type="secondary" style={{ fontSize: 14, marginBottom: 16 }}>
            {q.description}
          </Paragraph>
        )}

        <Descriptions column={{ xs: 1, sm: 2 }} size="small" style={{ marginTop: 12 }}>
          <Descriptions.Item label={<Space><ShopOutlined /> Supplier Facility</Space>}>
            <strong>{assignment.supplier?.companyName}</strong>
          </Descriptions.Item>

          <Descriptions.Item label={<Space><AppstoreOutlined /> Audited Product Line</Space>}>
            <strong>{assignment.product?.name || 'Facility-wide General Audit'}</strong>
          </Descriptions.Item>
        </Descriptions>

        {/* Live Completion Progress */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
            <Text type="secondary">
              Completion Progress: {answeredRequiredCount} of {requiredVisibleQuestions.length} required fields answered
            </Text>
            <Text strong style={{ color: progressPercent === 100 ? '#52c41a' : '#1677ff' }}>
              {progressPercent}%
            </Text>
          </div>
          <Progress
            percent={progressPercent}
            status={progressPercent === 100 ? 'success' : 'active'}
            showInfo={false}
          />
        </div>
      </Card>

      {/* Dynamic Questions List */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '24px 0 16px' }}>
          <InfoCircleOutlined style={{ color: '#1677ff' }} />
          <Text strong style={{ fontSize: 15, color: '#334155' }}>
            Questionnaire Checklist ({visibleQuestions.length} questions displayed)
          </Text>
        </div>

        {visibleQuestions.map((question, idx) => (
          <DynamicQuestionRenderer
            key={question.id}
            question={question}
            index={idx + 1}
            answer={answers[question.id]}
            onChange={handleAnswerChange}
            readOnly={isSubmitted}
            isFollowUp={incomingTargets.has(question.id)}
          />
        ))}
      </div>

      {/* Submission Confirmation Modal */}
      <Modal
        title="Confirm Final Submission"
        open={submitConfirmOpen}
        onCancel={() => setSubmitConfirmOpen(false)}
        onOk={() => {
          setSubmitConfirmOpen(false);
          saveMutation.mutate(true);
        }}
        okText="Confirm & Submit"
        cancelText="Review Answers"
      >
        <p>
          Are you sure you want to finalize and submit this quality audit response?
        </p>
        <Alert
          type="warning"
          message="Submission is Final"
          description="Once submitted, answers become immutable for compliance auditability. A supervisor must explicitly re-open the assignment if modifications are required."
          showIcon
        />
      </Modal>
    </div>
  );
};
