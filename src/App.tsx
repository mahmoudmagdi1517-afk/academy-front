import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { UserRole } from './types/auth';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { TeacherStudentsPage } from './pages/TeacherStudentsPage';
import { TeacherGroupsPage } from './pages/TeacherGroupsPage';
import { TeacherGroupDetailsPage } from './pages/TeacherGroupDetailsPage';
import { TeacherSchedulePage } from './pages/TeacherSchedulePage';
import { AttendanceReportsPage } from './pages/AttendanceReportsPage';
import { CoursesPage } from './pages/CoursesPage';
import { GroupDetailsPage } from './pages/GroupDetailsPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { SessionsPage } from './pages/SessionsPage';
import { MakeupsPage } from './pages/MakeupsPage';
import { HRPage } from './pages/HRPage';
import { PayrollPage } from './pages/PayrollPage';
import { TreasuryPage } from './pages/TreasuryPage';
import { UsersPage } from './pages/UsersPage';
import { AttendancePage } from './pages/AttendancePage';
import { NotFoundPage } from './pages/NotFoundPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1226] text-white text-xs font-semibold">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Verifying credentials...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(...allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route
          path="my-students"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherStudentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="my-groups"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherGroupsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="my-groups/:groupId"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherGroupDetailsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="my-schedule"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherSchedulePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="attendance-reports"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <AttendanceReportsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="students"
          element={
            <ProtectedRoute allowedRoles={['owner', 'manager', 'admin']}>
              <StudentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="courses"
          element={
            <ProtectedRoute allowedRoles={['owner', 'manager', 'admin']}>
              <CoursesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="groups/:groupId"
          element={
            <ProtectedRoute allowedRoles={['owner', 'manager', 'admin']}>
              <GroupDetailsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="subscriptions"
          element={
            <ProtectedRoute allowedRoles={['owner', 'manager', 'admin']}>
              <SubscriptionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="payments"
          element={
            <ProtectedRoute allowedRoles={['owner', 'manager', 'admin']}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="expenses"
          element={
            <ProtectedRoute allowedRoles={['owner', 'manager']}>
              <ExpensesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="treasury"
          element={
            <ProtectedRoute allowedRoles={['owner', 'manager']}>
              <TreasuryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="sessions"
          element={
            <ProtectedRoute allowedRoles={['owner', 'manager', 'admin', 'teacher']}>
              <SessionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="attendance"
          element={
            <ProtectedRoute allowedRoles={['owner', 'manager', 'admin', 'teacher']}>
              <AttendancePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="attendance/:sessionId"
          element={
            <ProtectedRoute allowedRoles={['owner', 'manager', 'admin', 'teacher']}>
              <AttendancePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="makeups"
          element={
            <ProtectedRoute allowedRoles={['owner', 'manager']}>
              <MakeupsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="hr"
          element={
            <ProtectedRoute allowedRoles={['owner', 'manager']}>
              <HRPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="payroll"
          element={
            <ProtectedRoute allowedRoles={['owner', 'manager']}>
              <PayrollPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['owner', 'manager']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default App;
