import React from 'react';
import { Card, Radio, Input, InputNumber, Space, Typography, Tag } from 'antd';
import { BranchesOutlined } from '@ant-design/icons';
import { Question, Answer } from '../../types';

const { Text, Paragraph } = Typography;

interface DynamicQuestionRendererProps {
  question: Question;
  index: number;
  answer?: Partial<Answer>;
  onChange?: (questionId: string, updates: Partial<Answer>) => void;
  readOnly?: boolean;
  isFollowUp?: boolean;
}

export const DynamicQuestionRenderer: React.FC<DynamicQuestionRendererProps> = ({
  question,
  index,
  answer,
  onChange,
  readOnly = false,
  isFollowUp = false,
}) => {
  const handleOptionChange = (optionId: string) => {
    if (readOnly || !onChange) return;
    const opt = question.options?.find((o) => o.id === optionId);
    let booleanVal: boolean | null = null;
    if (question.type === 'YES_NO') {
      booleanVal = opt?.value === 'yes' || opt?.label.toLowerCase() === 'yes';
    }
    onChange(question.id, {
      questionId: question.id,
      selectedOptionId: optionId,
      textValue: opt?.value || opt?.label,
      booleanValue: booleanVal,
    });
  };

  const handleTextChange = (text: string) => {
    if (readOnly || !onChange) return;
    onChange(question.id, {
      questionId: question.id,
      textValue: text,
    });
  };

  const handleNumberChange = (num: number | null) => {
    if (readOnly || !onChange) return;
    onChange(question.id, {
      questionId: question.id,
      numberValue: num,
    });
  };

  return (
    <Card
      style={{
        marginBottom: 16,
        borderRadius: 8,
        border: isFollowUp ? '1px dashed #1677ff' : '1px solid #e5e7eb',
        background: isFollowUp ? '#f8faff' : '#ffffff',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
      bodyStyle={{ padding: '20px 24px' }}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: isFollowUp ? '#e6f4ff' : '#f0f0f0',
                color: isFollowUp ? '#1677ff' : '#4b5563',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {index}
            </span>
            <Text strong style={{ fontSize: 15, color: '#111827' }}>
              {question.text}
            </Text>
            {question.isRequired && (
              <span style={{ color: '#ff4d4f', fontWeight: 600, fontSize: 14 }}>*</span>
            )}
          </div>

          <Space size={4}>
            {isFollowUp && (
              <Tag color="blue" icon={<BranchesOutlined />}>
                Follow-up Question
              </Tag>
            )}
            <Tag color="default" style={{ textTransform: 'capitalize' }}>
              {question.type.replace('_', ' ').toLowerCase()}
            </Tag>
          </Space>
        </div>
      </div>

      {/* Input controls based on question type */}
      <div style={{ marginTop: 16 }}>
        {/* YES / NO */}
        {question.type === 'YES_NO' && (
          <Radio.Group
            value={answer?.selectedOptionId}
            onChange={(e) => handleOptionChange(e.target.value)}
            disabled={readOnly}
          >
            <Space direction="vertical">
              {(question.options || []).map((opt) => (
                <Radio key={opt.id} value={opt.id}>
                  <span style={{ fontSize: 14 }}>{opt.label}</span>
                  {opt.followUpQuestionId && (
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                      (has follow-up)
                    </Text>
                  )}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        )}

        {/* SINGLE CHOICE */}
        {question.type === 'SINGLE_CHOICE' && (
          <Radio.Group
            value={answer?.selectedOptionId}
            onChange={(e) => handleOptionChange(e.target.value)}
            disabled={readOnly}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {(question.options || []).map((opt) => (
                <Radio key={opt.id} value={opt.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14, color: '#374151' }}>{opt.label}</span>
                  {opt.followUpQuestionId && (
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                      (triggers conditional follow-up)
                    </Text>
                  )}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        )}

        {/* TEXT */}
        {question.type === 'TEXT' && (
          <div>
            {readOnly ? (
              <div
                style={{
                  background: '#f9fafb',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid #e5e7eb',
                }}
              >
                <Paragraph style={{ margin: 0, color: '#1f2937', whiteSpace: 'pre-wrap' }}>
                  {answer?.textValue || <Text italic type="secondary">No answer provided</Text>}
                </Paragraph>
              </div>
            ) : (
              <Input.TextArea
                rows={3}
                placeholder="Type your response here..."
                value={answer?.textValue || ''}
                onChange={(e) => handleTextChange(e.target.value)}
                maxLength={2000}
                showCount
              />
            )}
          </div>
        )}

        {/* NUMBER */}
        {question.type === 'NUMBER' && (
          <div>
            {readOnly ? (
              <div
                style={{
                  background: '#f9fafb',
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid #e5e7eb',
                  display: 'inline-block',
                }}
              >
                <Text strong style={{ fontSize: 15, color: '#111827' }}>
                  {answer?.numberValue !== undefined && answer?.numberValue !== null
                    ? answer.numberValue
                    : <Text italic type="secondary">Not answered</Text>}
                </Text>
              </div>
            ) : (
              <InputNumber
                style={{ width: 220 }}
                placeholder="Enter numerical value"
                value={answer?.numberValue ?? null}
                onChange={handleNumberChange}
                step={0.1}
              />
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
