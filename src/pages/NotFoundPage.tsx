import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '80px 24px', textAlign: 'center' }}>
      <Result
        status="404"
        title="404"
        subTitle="Sorry, the page you visited does not exist in the QuAudit system."
        extra={
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        }
      />
    </div>
  );
};
