import React, { createContext, useContext } from 'react';
import useAuth from '../hooks/useAuth';

/**
 * Обёртка над Redux-состоянием auth.
 *
 * Используется как удобный API для не-Redux компонентов (лендинг и т.п.).
 * В остальном коде чаще используется useSelector(state => state.auth)
 * или хук useAuth напрямую.
 *
 * Возвращает: isAuthenticated, user, loading, tenant, isPlatformAdmin,
 * effectiveRole, impersonation.
 */
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);