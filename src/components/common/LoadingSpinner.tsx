import React from 'react';
import { Spin } from 'antd';

interface LoadingSpinnerProps {
  tip?: string;
  size?: 'small' | 'default' | 'large';
  minHeight?: number | string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  tip = 'Loading...',
  size = 'large',
  minHeight = '300px',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight,
        width: '100%',
      }}
    >
      <Spin size={size} tip={tip}>
        <div style={{ padding: 40 }} />
      </Spin>
    </div>
  );
};
