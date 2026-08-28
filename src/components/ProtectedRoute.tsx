import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requireAdmin?: boolean;
}> = ({ children, requireAdmin = false }) => {
  const { user, profile, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-light dark:bg-brand-dark">
        <div className="w-10 h-10 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (!profile.ativo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-brand-light dark:bg-brand-dark">
        <h1 className="text-2xl font-bold text-brand-red mb-2">Acesso Inativo</h1>
        <p className="text-slate-600 dark:text-zinc-400 max-w-md">
          Sua conta de revendedor foi desativada pelo administrador. Entre em contato com a equipe de suporte da MSPLAY.
        </p>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};