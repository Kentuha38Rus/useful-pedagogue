import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import LoginPage from '../pages/Login/LoginPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import UsersPage from '../pages/Users/UsersPage';
import GroupsPage from '../pages/Groups/GroupsPage';
import CoursesPage from '../pages/Courses/CoursesPage';
import PaymentsPage from '../pages/Payments/PaymentsPage';
import Sidebar from '../components/layout/Sidebar';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading, initialized } = useSelector((state) => state.auth);
  console.log('PrivateRoute:', { isAuthenticated, loading, initialized });

  if (!initialized || loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Загрузка...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AdminLayout = ({ children }) => (
  <div style={{ display: 'flex', width: '100%' }}>
    <Sidebar />
    <div style={{ flex: 1, padding: '20px' }}>
      {children}
    </div>
  </div>
);

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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;