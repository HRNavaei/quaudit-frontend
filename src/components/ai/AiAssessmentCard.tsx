import React from 'react';
import { Card, Tag, Typography, Space, Button, Divider, Progress } from 'antd';
import {
  ThunderboltOutlined,
  ReloadOutlined,
  WarningOutlined,
  BulbOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { AiAssessmentResponse } from '../../types';

const { Title, Text, Paragraph } = Typography;

interface AiAssessmentCardProps {
  assessment: AiAssessmentResponse;
  onRefresh?: () => void;
  loading?: boolean;
}

export const AiAssessmentCard: React.FC<AiAssessmentCardProps> = ({
  assessment,
  onRefresh,
  loading = false,
}) => {
  const { score, label, summary, concerns = [], recommendations = [], disclaimer } = assessment;

  // Determine score color scheme
  const getRatingTheme = (scoreVal: number, labelStr: string) => {
    const normalized = (labelStr || '').toLowerCase();
    if (scoreVal >= 75 || normalized.includes('good') || normalized.includes('excellent')) {
      return {
        color: '#52c41a',
        badgeColor: 'success',
        bg: '#f6ffed',
        border: '#b7eb8f',
      };
    }
    if (scoreVal >= 60 || normalized.includes('satisfactory')) {
      return {
        color: '#faad14',
        badgeColor: 'warning',
        bg: '#fffbe6',
        border: '#ffe58f',
      };
    }
    return {
      color: '#ff4d4f',
      badgeColor: 'error',
      bg: '#fff2f0',
      border: '#ffccc7',
    };
  };

  const theme = getRatingTheme(score, label);

  return (
    <Card
      bordered
      style={{
        borderRadius: 12,
        borderColor: '#e2e8f0',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
        background: '#ffffff',
        overflow: 'hidden',
        marginBottom: 24,
      }}
      bodyStyle={{ padding: 24 }}
    >
      {/* Header banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          paddingBottom: 18,
          borderBottom: '1px solid #f1f5f9',
          marginBottom: 20,
        }}
      >
        <Space align="center">
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 20,
              boxShadow: '0 2px 6px rgba(99, 102, 241, 0.35)',
            }}
          >
            <ThunderboltOutlined />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
                AI Supplier Audit Assessment
              </Title>
              <Tag color="purple" style={{ borderRadius: 10, fontSize: 11, fontWeight: 500 }}>
                Automated Review
              </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Synthesized from submitted supplier responses, evidence, and compliance questions
            </Text>
          </div>
        </Space>

        {onRefresh && (
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={onRefresh}
            loading={loading}
            size="small"
            style={{ borderRadius: 6 }}
          >
            Re-evaluate
          </Button>
        )}
      </div>

      {/* Score and Rating Badge Section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          padding: 16,
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          borderRadius: 10,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <Progress
          type="circle"
          percent={score}
          size={78}
          strokeColor={theme.color}
          format={(percent) => (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', lineHeight: 1.1 }}>
                {percent}
              </div>
              <div style={{ fontSize: 10, color: '#64748b' }}>/ 100</div>
            </div>
          )}
        />

        <div style={{ flex: 1, minWidth: 200 }}>
          <Space direction="horizontal" size={8} style={{ marginBottom: 4 }}>
            <Text style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Indicative Rating:</Text>
            <Tag
              color={theme.badgeColor}
              style={{
                fontSize: 14,
                fontWeight: 600,
                padding: '2px 12px',
                borderRadius: 12,
              }}
            >
              {label}
            </Tag>
          </Space>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Score calculated across mandatory and conditional compliance parameters.
            </Text>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div style={{ marginBottom: 20 }}>
        <Title level={5} style={{ color: '#1e293b', marginBottom: 8 }}>
          Executive Summary
        </Title>
        <Paragraph
          style={{
            color: '#334155',
            fontSize: 14,
            lineHeight: 1.6,
            background: '#f8fafc',
            padding: '12px 16px',
            borderRadius: 8,
            borderLeft: '4px solid #6366f1',
            margin: 0,
          }}
        >
          {summary}
        </Paragraph>
      </div>

      {/* Concerns & Weaknesses */}
      {concerns.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Title
            level={5}
            style={{
              color: '#d97706',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <WarningOutlined />
            <span>Key Weaknesses & Concerns</span>
          </Title>
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 8,
              padding: '10px 16px',
            }}
          >
            <ul style={{ margin: 0, paddingLeft: 20, color: '#92400e' }}>
              {concerns.map((concern, idx) => (
                <li key={idx} style={{ marginBottom: idx === concerns.length - 1 ? 0 : 6 }}>
                  <Text style={{ color: '#92400e', fontSize: 13 }}>{concern}</Text>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Actionable Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Title
            level={5}
            style={{
              color: '#1d4ed8',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <BulbOutlined />
            <span>Actionable Recommendations</span>
          </Title>
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 8,
              padding: '10px 16px',
            }}
          >
            <ul style={{ margin: 0, paddingLeft: 20, color: '#1e40af' }}>
              {recommendations.map((rec, idx) => (
                <li key={idx} style={{ marginBottom: idx === recommendations.length - 1 ? 0 : 6 }}>
                  <Text style={{ color: '#1e40af', fontSize: 13 }}>{rec}</Text>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      {disclaimer && (
        <div>
          <Divider style={{ margin: '16px 0 12px 0' }} />
          <Text
            type="secondary"
            italic
            style={{
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#94a3b8',
            }}
          >
            <InfoCircleOutlined />
            <span>{disclaimer}</span>
          </Text>
        </div>
      )}
    </Card>
  );
};
