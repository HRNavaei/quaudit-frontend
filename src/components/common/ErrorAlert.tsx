import React from 'react';
import { Alert, Button } from 'antd';

interface ErrorAlertProps {
  message?: string;
  description?: string;
  onRetry?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message = 'An error occurred',
  description = 'Failed to load data. Please try again.',
  onRetry,
}) => {
  return (
    <div style={{ margin: '16px 0' }}>
      <Alert
        message={message}
        description={
          <div>
            <p style={{ margin: '4px 0 12px' }}>{description}</p>
            {onRetry && (
              <Button size="small" danger onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        }
        type="error"
        showIcon
      />
    </div>
  );
};
