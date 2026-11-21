import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/common/ProtectedRoute';

// Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { PendingApprovalPage } from '../pages/auth/PendingApprovalPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { SupplierManagementPage } from '../pages/suppliers/SupplierManagementPage';
import { PendingSuppliersPage } from '../pages/suppliers/PendingSuppliersPage';
import { ProductManagementPage } from '../pages/products/ProductManagementPage';
import { QuestionnaireListPage } from '../pages/questionnaires/QuestionnaireListPage';
import { QuestionnaireBuilderPage } from '../pages/questionnaires/QuestionnaireBuilderPage';
import { AssignmentManagementPage } from '../pages/assignments/AssignmentManagementPage';
import { SupplierAssignmentsPage } from '../pages/assignments/SupplierAssignmentsPage';
import { QuestionnaireCompletionPage } from '../pages/assignments/QuestionnaireCompletionPage';
import { ResponseManagementPage } from '../pages/responses/ResponseManagementPage';
import { ResponseAnalysisPage } from '../pages/responses/ResponseAnalysisPage';
import { NotificationListPage } from '../pages/notifications/NotificationListPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/pending-approval" element={<PendingApprovalPage />} />

      {/* Protected routes wrapped in AppLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Supplier Management (ADMIN and SUPERVISOR) */}
        <Route
          path="suppliers"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}>
              <SupplierManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="suppliers/pending"
          element={
            <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']}>
              <PendingSuppliersPage />
            </ProtectedRoute>
          }
        />

        {/* Product Management (All roles: Supervisor/Admin sees all, Supplier sees own) */}
        <Route path="products" element={<ProductManagementPage />} />

        {/* Questionnaire Management (ADMIN and SUPERVISOR) */}
        <Route
          path="questionnaires"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}>
              <QuestionnaireListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="questionnaires/new"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}>
              <QuestionnaireBuilderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="questionnaires/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}>
              <QuestionnaireBuilderPage />
            </ProtectedRoute>
          }
        />

        {/* Assignment Management (ADMIN and SUPERVISOR) */}
        <Route
          path="assignments"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}>
              <AssignmentManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Supplier My Audits (SUPPLIER only) */}
        <Route
          path="my-assignments"
          element={
            <ProtectedRoute allowedRoles={['SUPPLIER']}>
              <SupplierAssignmentsPage />
            </ProtectedRoute>
          }
        />

        {/* Questionnaire Completion Form (All roles) */}
        <Route path="assignments/:id/complete" element={<QuestionnaireCompletionPage />} />

        {/* Responses (Both Supervisor/Admin and Supplier) */}
        <Route path="responses" element={<ResponseManagementPage />} />

        {/* Response Analytics (ADMIN and SUPERVISOR) */}
        <Route
          path="analytics"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}>
              <ResponseAnalysisPage />
            </ProtectedRoute>
          }
        />

        {/* Notifications & Profile (All authenticated) */}
        <Route path="notifications" element={<NotificationListPage />} />
        <Route path="profile" element={<ProfilePage />} />

        {/* 404 inside layout */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Global 404 fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
