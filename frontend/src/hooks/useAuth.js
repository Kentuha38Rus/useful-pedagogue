import { useSelector } from 'react-redux';

const useAuth = () => {
  const {
    isAuthenticated,
    user,
    loading,
    tenant,
    isPlatformAdmin,
    effectiveRole,
    impersonation,
  } = useSelector((state) => state.auth);

  return {
    isAuthenticated,
    user,
    loading,
    tenant,
    isPlatformAdmin,
    effectiveRole,
    impersonation,
  };
};

export default useAuth;