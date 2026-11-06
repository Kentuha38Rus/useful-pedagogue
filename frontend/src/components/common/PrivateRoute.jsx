import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * Защищённый маршрут.
 *
 * props:
 *   role: 'platform_admin' | 'admin' | 'teacher' | 'parent' (опционально)
 *         Если задан и не совпадает с effectiveRole — редирект в «свою» зону.
 *
 * effectiveRole учитывает имперсонацию: platform_admin с X-Tenant-Id
 * имеет effectiveRole = 'admin' (см. backend auth middleware + getMe).
 */
const PrivateRoute = ({ children, role = null }) => {
  const { isAuthenticated, loading, user, effectiveRole } = useSelector(
    (state) => state.auth
  );

  if (loading) return <div style={{ padding: '20px' }}>Загрузка...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const currentRole = effectiveRole || user?.role;

  if (role && currentRole !== role) {
    return (
      <Navigate
        to={user?.role === 'platform_admin' && !effectiveRole?.startsWith?.('admin')
          ? '/platform'
          : '/app'}
        replace
      />
    );
  }

  return children;
};

export default PrivateRoute;