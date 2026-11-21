import React from 'react';
import { Tag, Badge } from 'antd';
import { QuestionnaireStatus, AssignmentStatus } from '../../types';

interface StatusBadgeProps {
  status: QuestionnaireStatus | AssignmentStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    // Questionnaire statuses
    case 'DRAFT':
      return <Tag color="warning">Draft</Tag>;
    case 'ASSIGNED':
      return <Tag color="blue">Assigned</Tag>;

    // Assignment statuses
    case 'PENDING':
      return <Tag color="gold">Pending</Tag>;
    case 'IN_PROGRESS':
      return <Tag color="processing">In Progress</Tag>;
    case 'SUBMITTED':
      return <Tag color="green">Submitted</Tag>;

    default:
      return <Badge status="default" text={status} />;
  }
};
