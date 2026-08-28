import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore.tsx';

export const RequireProfile = () => {
  const { state } = useAppStore();
  if (!state.selectedProfile) {
    return <Navigate replace to="/profiles" />;
  }
  return <Outlet />;
};