import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import { LoadingSpinner } from './LoadingSpinner';
import { Result, Button } from 'antd';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner tip="Checking authorization..." minHeight="100vh" />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Pending approval guard for SUPPLIER accounts
  if (
    user.role === 'SUPPLIER' &&
    (user.isApproved === false || user.supplier?.isApproved === false)
  ) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ padding: '60px 20px', maxWidth: 600, margin: '0 auto' }}>
        <Result
          status="403"
          title="403 Forbidden"
          subTitle={`Your current role (${user.role}) does not have permission to access this page.`}
          extra={
            <Link to="/dashboard">
              <Button type="primary">Back to Dashboard</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
};
