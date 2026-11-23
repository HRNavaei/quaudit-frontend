import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Typography,
  Progress,
  Tag,
  List,
  Statistic,
  Space,
} from 'antd';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { questionnairesApi } from '../../api/questionnaires';
import { analyticsApi } from '../../api/analytics';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useIsMobile } from '../../hooks/useIsMobile';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const { Title, Text, Paragraph } = Typography;

const STATUS_COLORS = ['#faad14', '#1677ff', '#52c41a'];

export const ResponseAnalysisPage: React.FC = () => {
  const isMobile = useIsMobile();
  const location = useLocation();

  const { data: questionnaires = [], isLoading: loadingQ } = useQuery({
    queryKey: ['questionnaires'],
    queryFn: () => questionnairesApi.getAll(),
  });

  const [selectedQId, setSelectedQId] = useState<string>('');

  // Default to first questionnaire or questionnaire passed in state
  React.useEffect(() => {
    const passedId = (location.state as any)?.questionnaireId;
    if (passedId) {
      setSelectedQId(passedId);
    } else if (questionnaires.length > 0 && !selectedQId) {
      setSelectedQId(questionnaires[0].id);
    }
  }, [location.state, questionnaires, selectedQId]);

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['analytics', selectedQId],
    queryFn: () => analyticsApi.getQuestionnaireStats(selectedQId),
    enabled: !!selectedQId,
  });

  if (loadingQ) {
    return <LoadingSpinner tip="Loading analytics..." />;
  }

  const statusPieData = stats
    ? [
        { name: 'Pending', value: stats.pendingAssignments },
        { name: 'In Progress', value: stats.inProgressAssignments },
        { name: 'Completed', value: stats.completedAssignments },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#0f172a' }}>
            Response Analysis & Quality Intelligence
          </Title>
          <Text type="secondary">
            Statistical distribution, compliance yield, and question-level analytics.
          </Text>
        </div>

        <Select
          value={selectedQId}
          onChange={setSelectedQId}
          style={{ width: isMobile ? '100%' : 'auto', minWidth: isMobile ? '100%' : 300 }}
          placeholder="Select questionnaire to analyze"
          options={questionnaires.map((q) => ({
            value: q.id,
            label: `${q.title} (${q.status})`,
          }))}
        />
      </div>

      {loadingStats || !stats ? (
        <LoadingSpinner tip="Computing response statistics..." />
      ) : (
        <div>
          {/* Top Metric Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <Statistic
                  title="Total Dispatched"
                  value={stats.totalAssignments}
                  prefix={<AuditOutlined style={{ color: '#1677ff', marginRight: 8 }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <Statistic
                  title="Completed Audits"
                  value={stats.completedAssignments}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <Statistic
                  title="In Progress"
                  value={stats.inProgressAssignments}
                  prefix={<ClockCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <Statistic
                  title="Completion Rate"
                  value={stats.completionRate}
                  suffix="%"
                  prefix={<BarChartOutlined style={{ color: '#722ed1', marginRight: 8 }} />}
                />
              </Card>
            </Col>
          </Row>

          {/* Visual Overview Chart */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={12}>
              <Card
                title="Assignment Status Breakdown"
                bordered={false}
                style={{ borderRadius: 8, height: 320 }}
              >
                {statusPieData.length === 0 ? (
                  <div style={{ textAlign: 'center', paddingTop: 80, color: '#94a3b8' }}>
                    No assignment data to display.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={45}
                        paddingAngle={4}
                      >
                        {statusPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title="Audit Health & Turnaround Summary"
                bordered={false}
                style={{ borderRadius: 8, height: 320 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 10 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text strong>Audit Fulfillment Progress</Text>
                      <Text strong>{stats.completedAssignments} / {stats.totalAssignments}</Text>
                    </div>
                    <Progress
                      percent={stats.completionRate}
                      status={stats.completionRate === 100 ? 'success' : 'active'}
                      strokeWidth={12}
                    />
                  </div>

                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 12 }}>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                      Audit Target Title:
                    </Text>
                    <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                      {stats.title}
                    </Text>
                    <div style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
                      Questions Analyzed: <strong>{stats.questionBreakdown.length}</strong> items
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Question-by-Question Deep Dive */}
          <Title level={4} style={{ margin: '32px 0 16px', color: '#1e293b' }}>
            Question-by-Question Analytical Breakdown
          </Title>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {stats.questionBreakdown.map((item, idx) => {
              const optionData = item.optionCounts
                ? Object.values(item.optionCounts).map((o) => ({
                    label: o.label,
                    count: o.count,
                    percentage: o.percentage,
                  }))
                : [];

              return (
                <Card
                  key={item.questionId}
                  style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
                  bodyStyle={{ padding: '20px 24px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <Space>
                        <Tag color="blue" style={{ fontWeight: 700 }}>
                          Q{idx + 1}
                        </Tag>
                        <Tag color="default">{item.type}</Tag>
                        <Tag color="cyan">{item.totalAnswers} Answers Recorded</Tag>
                      </Space>
                      <div style={{ marginTop: 8 }}>
                        <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                          {item.questionText}
                        </Text>
                      </div>
                    </div>
                  </div>

                  {/* Choice distribution */}
                  {(item.type === 'YES_NO' || item.type === 'SINGLE_CHOICE') && (
                    <div style={{ marginTop: 12 }}>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {optionData.map((opt, oIdx) => (
                              <div key={oIdx}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                  <span>{opt.label}</span>
                                  <Text strong>
                                    {opt.count} ({opt.percentage}%)
                                  </Text>
                                </div>
                                <Progress percent={opt.percentage} strokeColor="#1677ff" size="small" />
                              </div>
                            ))}
                          </div>
                        </Col>

                        <Col xs={24} md={12}>
                          <ResponsiveContainer width="100%" height={140}>
                            <BarChart data={optionData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis dataKey="label" type="category" width={80} tick={{ fontSize: 11 }} />
                              <RechartsTooltip />
                              <Bar dataKey="count" fill="#1677ff" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </Col>
                      </Row>
                    </div>
                  )}

                  {/* Number stats */}
                  {item.type === 'NUMBER' && (
                    <div style={{ marginTop: 12 }}>
                      <Row gutter={[16, 16]}>
                        <Col xs={8}>
                          <Card size="small" style={{ background: '#f8fafc', textAlign: 'center' }}>
                            <Statistic title="Average Value" value={item.average ?? 'N/A'} precision={1} />
                          </Card>
                        </Col>
                        <Col xs={8}>
                          <Card size="small" style={{ background: '#f8fafc', textAlign: 'center' }}>
                            <Statistic title="Minimum" value={item.min ?? 'N/A'} />
                          </Card>
                        </Col>
                        <Col xs={8}>
                          <Card size="small" style={{ background: '#f8fafc', textAlign: 'center' }}>
                            <Statistic title="Maximum" value={item.max ?? 'N/A'} />
                          </Card>
                        </Col>
                      </Row>
                    </div>
                  )}

                  {/* Text samples */}
                  {item.type === 'TEXT' && (
                    <div style={{ marginTop: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                        Sample Recorded Responses:
                      </Text>
                      {item.sampleTextAnswers && item.sampleTextAnswers.length > 0 ? (
                        <List
                          size="small"
                          bordered
                          dataSource={item.sampleTextAnswers}
                          renderItem={(txt) => (
                            <List.Item>
                              <Paragraph style={{ margin: 0, fontSize: 13 }}>"{txt}"</Paragraph>
                            </List.Item>
                          )}
                        />
                      ) : (
                        <Text italic type="secondary">No responses submitted yet.</Text>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
