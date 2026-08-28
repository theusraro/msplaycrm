import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore.tsx';

export const RequireAuth = () => {
  const { state } = useAppStore();
  if (!state.isAuthenticated) {
    return <Navigate replace to="/login" />;
  }
  return <Outlet />;
};