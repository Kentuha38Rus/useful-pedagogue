import { useSelector } from 'react-redux';

const useAuth = () => {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);
  return { isAuthenticated, user, loading };
};

export default useAuth;