import React, { useState } from 'react';
import { Card, List, Button, Tag, Typography, Space } from 'antd';
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

const { Title, Text, Paragraph } = Typography;

export const NotificationListPage: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />;
      case 'WARNING':
        return <WarningOutlined style={{ color: '#faad14', fontSize: 18 }} />;
      case 'URGENT':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />;
      case 'INFO':
      default:
        return <InfoCircleOutlined style={{ color: '#1677ff', fontSize: 18 }} />;
    }
  };

  return (
    <div style={{ maxWidth: 850, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            Notifications & Compliance Alerts
          </Title>
          <Text type="secondary">
            System notices, assignment dispatches, and audit submission confirmations.
          </Text>
        </div>

        {unreadCount > 0 && (
          <Button icon={<CheckOutlined />} onClick={markAllAsRead}>
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>

      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              type={filter === 'ALL' ? 'primary' : 'default'}
              size="small"
              onClick={() => setFilter('ALL')}
            >
              All ({notifications.length})
            </Button>
            <Button
              type={filter === 'UNREAD' ? 'primary' : 'default'}
              size="small"
              onClick={() => setFilter('UNREAD')}
            >
              Unread ({unreadCount})
            </Button>
          </Space>
        </div>

        {filteredNotifications.length === 0 ? (
          <EmptyState
            title="No Notifications"
            description={
              filter === 'UNREAD'
                ? 'You are all caught up! No unread notifications.'
                : 'You have not received any notifications yet.'
            }
          />
        ) : (
          <List
            loading={isLoading}
            itemLayout="horizontal"
            dataSource={filteredNotifications}
            renderItem={(item: Notification) => (
              <List.Item
                style={{
                  padding: '16px 20px',
                  borderRadius: 6,
                  marginBottom: 8,
                  background: item.isRead ? '#ffffff' : '#f0f7ff',
                  border: item.isRead ? '1px solid #f0f0f0' : '1px solid #bae0ff',
                  cursor: !item.isRead ? 'pointer' : 'default',
                  transition: 'background 0.2s',
                }}
                onClick={() => {
                  if (!item.isRead) markAsRead(item.id);
                }}
                actions={[
                  !item.isRead ? (
                    <Button
                      type="link"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(item.id);
                      }}
                    >
                      Mark read
                    </Button>
                  ) : (
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Read</span>
                  ),
                ]}
              >
                <List.Item.Meta
                  avatar={getNotificationIcon(item.type)}
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text strong style={{ color: '#0f172a', fontSize: 14 }}>
                        {item.title}
                      </Text>
                      {!item.isRead && (
                        <Tag color="processing" style={{ fontSize: 10, lineHeight: '16px' }}>
                          NEW
                        </Tag>
                      )}
                      <Tag color="default" style={{ fontSize: 10 }}>
                        {item.type}
                      </Tag>
                    </div>
                  }
                  description={
                    <div>
                      <Paragraph style={{ margin: '4px 0 6px', color: '#334155', fontSize: 13 }}>
                        {item.message}
                      </Paragraph>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {new Date(item.createdAt).toLocaleString()}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};
