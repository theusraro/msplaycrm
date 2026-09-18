import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { ResellerDashboard } from './pages/ResellerDashboard';

const AppRoutes: React.FC = () => {
  const { user, profile, isAdmin, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light dark:bg-brand-dark flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Usuário autenticado mas sem perfil correspondente no banco
  if (user && !profile) {
    return (
      <div className="min-h-screen bg-brand-light dark:bg-brand-dark flex flex-col items-center justify-center p-4 text-center">
        <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard rounded-2xl p-8 shadow-xl max-w-md">
          <h1 className="text-xl font-bold text-brand-red mb-2">Perfil não encontrado</h1>
          <p className="text-sm text-slate-600 dark:text-zinc-400 mb-6">
            Não foi possível carregar as permissões do seu perfil de usuário. Entre em contato com a equipe MSPLAY.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-brand-red text-white text-xs font-bold rounded-xl hover:bg-brand-redHover transition"
            >
              Recarregar
            </button>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-xs font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-zinc-700 transition"
            >
              Trocar de Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  const defaultDestination = !user
    ? '/login'
    : isAdmin
    ? '/admin'
    : '/dashboard';

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={defaultDestination} replace /> : <Login />}
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin={true}>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requireReseller={true}>
            <Layout>
              <ResellerDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={<Navigate to={defaultDestination} replace />}
      />
    </Routes>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
