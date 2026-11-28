import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import LoginPage from '../pages/Login/LoginPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import UsersPage from '../pages/Users/UsersPage';
import GroupsPage from '../pages/Groups/GroupsPage';
import BranchesPage from '../pages/Branches/BranchesPage';
import InventoryPage from '../pages/Inventory/InventoryPage';
import FinancePage from '../pages/Finance/FinancePage';
import CoursesPage from '../pages/Courses/CoursesPage';
import PaymentsPage from '../pages/Payments/PaymentsPage';
import SalaryPage from '../pages/Salary/SalaryPage';
import ChatsPage from '../pages/Chats/ChatsPage';
import SettingsPage from '../pages/Settings/SettingsPage';
import AdminLayout from '../components/layout/AdminLayout';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading, initialized } = useSelector(
    (state) => state.auth
  );

  if (!initialized || loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>Загрузка...</div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <AdminLayout>
              <DashboardPage />
            </AdminLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/users"
        element={
          <PrivateRoute>
            <AdminLayout>
              <UsersPage />
            </AdminLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/finance"
        element={
          <PrivateRoute>
            <AdminLayout>
              <FinancePage />
            </AdminLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/inventory"
        element={
          <PrivateRoute>
            <AdminLayout>
              <InventoryPage />
            </AdminLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/branches"
        element={
          <PrivateRoute>
            <AdminLayout>
              <BranchesPage />
            </AdminLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/groups"
        element={
          <PrivateRoute>
            <AdminLayout>
              <GroupsPage />
            </AdminLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/courses"
        element={
          <PrivateRoute>
            <AdminLayout>
              <CoursesPage />
            </AdminLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/payments"
        element={
          <PrivateRoute>
            <AdminLayout>
              <PaymentsPage />
            </AdminLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/salary"
        element={
          <PrivateRoute>
            <AdminLayout>
              <SalaryPage />
            </AdminLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/chats"
        element={
          <PrivateRoute>
            <AdminLayout>
              <ChatsPage />
            </AdminLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/chats/:chatId"
        element={
          <PrivateRoute>
            <AdminLayout>
              <ChatsPage />
            </AdminLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <AdminLayout>
              <SettingsPage />
            </AdminLayout>
          </PrivateRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;