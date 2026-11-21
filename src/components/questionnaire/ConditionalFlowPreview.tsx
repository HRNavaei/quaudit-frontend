import React from 'react';
import { Card, Tag, Typography, Alert, Empty } from 'antd';
import { BranchesOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { Question } from '../../types';
import { getIncomingFollowUpTargets, detectCycle } from '../../utils/conditionalLogic';

const { Text } = Typography;

interface ConditionalFlowPreviewProps {
  questions: Question[];
}

export const ConditionalFlowPreview: React.FC<ConditionalFlowPreviewProps> = ({ questions }) => {
  const incomingTargets = getIncomingFollowUpTargets(questions);
  const cycleInfo = detectCycle(questions);

  // Find all branches
  const branches: Array<{
    sourceQuestion: Question;
    optionLabel: string;
    targetQuestion: Question;
  }> = [];

  questions.forEach((q) => {
    (q.options || []).forEach((opt) => {
      if (opt.followUpQuestionId) {
        const target = questions.find((item) => item.id === opt.followUpQuestionId);
        if (target) {
          branches.push({
            sourceQuestion: q,
            optionLabel: opt.label,
            targetQuestion: target,
          });
        }
      }
    });
  });

  return (
    <Card
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BranchesOutlined style={{ color: '#1677ff' }} />
          Conditional Logic & Branching Map
        </span>
      }
      style={{ marginBottom: 24, borderRadius: 8 }}
      extra={<Tag color="blue">{branches.length} Conditional Rules</Tag>}
    >
      {cycleInfo.hasCycle && (
        <Alert
          type="error"
          showIcon
          message="Circular Branching Detected!"
          description="Your conditional questions form a cycle. Please adjust follow-up targets so questions don't loop endlessly."
          style={{ marginBottom: 16 }}
        />
      )}

      {branches.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No conditional rules configured. All questions will be displayed sequentially."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {branches.map((branch, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                padding: '12px 16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
              }}
            >
              <div style={{ maxWidth: 320 }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  WHEN ANSWERING
                </Text>
                <Text strong style={{ fontSize: 13, color: '#1e293b' }}>
                  {branch.sourceQuestion.text}
                </Text>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArrowRightOutlined style={{ color: '#94a3b8' }} />
                <Tag color="cyan" style={{ fontWeight: 600 }}>
                  Option: "{branch.optionLabel}"
                </Tag>
                <ArrowRightOutlined style={{ color: '#94a3b8' }} />
              </div>

              <div style={{ maxWidth: 320, background: '#eff6ff', padding: '6px 12px', borderRadius: 6, border: '1px solid #bfdbfe' }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', color: '#1d4ed8' }}>
                  REVEALS FOLLOW-UP
                </Text>
                <Text strong style={{ fontSize: 13, color: '#1e40af' }}>
                  {branch.targetQuestion.text}
                </Text>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 24, fontSize: 12, color: '#64748b' }}>
        <div>
          <strong>Root Questions (Always Visible):</strong> {questions.filter((q) => !incomingTargets.has(q.id)).length}
        </div>
        <div>
          <strong>Conditional Questions (Hidden Until Triggered):</strong> {incomingTargets.size}
        </div>
      </div>
    </Card>
  );
};
