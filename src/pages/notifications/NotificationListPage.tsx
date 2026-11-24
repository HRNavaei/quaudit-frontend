import React, { useState } from 'react';
import { Card, Button, Tag, Typography, Space, Spin } from 'antd';
import {
  CheckOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNotifications } from '../../context/NotificationContext';
import { Notification } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
import { useIsMobile } from '../../hooks/useIsMobile';

const { Title, Text, Paragraph } = Typography;

export const NotificationListPage: React.FC = () => {
  const isMobile = useIsMobile();
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
      case 'SUBMISSION':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: isMobile ? 18 : 20 }} />;
      case 'WARNING':
        return <WarningOutlined style={{ color: '#faad14', fontSize: isMobile ? 18 : 20 }} />;
      case 'URGENT':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: isMobile ? 18 : 20 }} />;
      case 'INFO':
      default:
        return <InfoCircleOutlined style={{ color: '#1677ff', fontSize: isMobile ? 18 : 20 }} />;
    }
  };

  return (
    <div style={{ maxWidth: 850, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          marginBottom: 16,
          gap: 12,
        }}
      >
        <div>
          <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#0f172a' }}>
            Notifications & Compliance Alerts
          </Title>
          <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>
            System notices, assignment dispatches, and audit submission confirmations.
          </Text>
        </div>

        {unreadCount > 0 && (
          <Button
            icon={<CheckOutlined />}
            onClick={markAllAsRead}
            style={{ width: isMobile ? '100%' : 'auto' }}
          >
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>

      <Card
        bordered={false}
        styles={{ body: { padding: isMobile ? 12 : 20 } }}
        style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <div style={{ marginBottom: 14 }}>
          <Space size={8}>
            <Button
              type={filter === 'ALL' ? 'primary' : 'default'}
              size={isMobile ? 'middle' : 'small'}
              onClick={() => setFilter('ALL')}
            >
              All ({notifications.length})
            </Button>
            <Button
              type={filter === 'UNREAD' ? 'primary' : 'default'}
              size={isMobile ? 'middle' : 'small'}
              onClick={() => setFilter('UNREAD')}
            >
              Unread ({unreadCount})
            </Button>
          </Space>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip="Loading notifications..." />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            title="No Notifications"
            description={
              filter === 'UNREAD'
                ? 'You are all caught up! No unread notifications.'
                : 'You have not received any notifications yet.'
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredNotifications.map((item: Notification) => (
              <div
                key={item.id}
                style={{
                  padding: isMobile ? '12px 14px' : '16px 20px',
                  borderRadius: 8,
                  background: item.isRead ? '#ffffff' : '#f0f7ff',
                  border: item.isRead ? '1px solid #f0f0f0' : '1px solid #bae0ff',
                  cursor: !item.isRead ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: isMobile ? 12 : 16,
                }}
                onClick={() => {
                  if (!item.isRead) markAsRead(item.id);
                }}
              >
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  {getNotificationIcon(item.type)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Header: Title and tags */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <Text
                        strong
                        style={{
                          color: '#0f172a',
                          fontSize: isMobile ? 13.5 : 14,
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                        }}
                      >
                        {item.title}
                      </Text>
                      {!item.isRead && (
                        <Tag
                          color="processing"
                          style={{
                            fontSize: 10,
                            lineHeight: '16px',
                            padding: '0 6px',
                            margin: 0,
                          }}
                        >
                          NEW
                        </Tag>
                      )}
                      <Tag
                        color="default"
                        style={{
                          fontSize: 10,
                          lineHeight: '16px',
                          padding: '0 6px',
                          margin: 0,
                        }}
                      >
                        {item.type}
                      </Tag>
                    </div>

                    {/* Desktop Mark read / Read status */}
                    {!isMobile && (
                      <div style={{ flexShrink: 0 }}>
                        {!item.isRead ? (
                          <Button
                            type="link"
                            size="small"
                            style={{ padding: 0, height: 'auto', fontSize: 12 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(item.id);
                            }}
                          >
                            Mark read
                          </Button>
                        ) : (
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>Read</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Message body */}
                  <Paragraph
                    style={{
                      margin: '4px 0 8px',
                      color: '#334155',
                      fontSize: isMobile ? 13 : 13.5,
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.message}
                  </Paragraph>

                  {/* Footer: timestamp & mobile Mark read */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginTop: 4,
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>

                    {isMobile && (
                      <div>
                        {!item.isRead ? (
                          <Button
                            type="link"
                            size="small"
                            style={{ padding: 0, height: 'auto', fontSize: 12, fontWeight: 500 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(item.id);
                            }}
                          >
                            Mark read
                          </Button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>✓ Read</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
