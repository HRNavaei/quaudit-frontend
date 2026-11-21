import React from 'react';
import { Empty, Button } from 'antd';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Available',
  description = 'There are no records to display at this moment.',
  actionText,
  onAction,
}) => {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <Empty
        description={
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: '#1f2937' }}>{title}</div>
            <div style={{ color: '#6b7280' }}>{description}</div>
          </div>
        }
      >
        {actionText && onAction && (
          <Button type="primary" onClick={onAction}>
            {actionText}
          </Button>
        )}
      </Empty>
    </div>
  );
};
