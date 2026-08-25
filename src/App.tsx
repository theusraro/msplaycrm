import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { ResellerDashboard } from './pages/ResellerDashboard';

const AppRoutes: React.FC = () => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-brand-light dark:bg-brand-dark"></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace /> : <Login />} />
      <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Layout><ResellerDashboard /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={user ? (isAdmin ? '/admin' : '/dashboard') : '/login'} replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}