import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { LogOut, ShieldCheck, UserCheck } from 'lucide-react';
import { MsplayLogo } from './ui/MsplayLogo';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, signOut, isAdmin } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-brand-light dark:bg-brand-dark text-slate-900 dark:text-white transition-colors duration-200">
      <header className="sticky top-0 z-40 w-full border-b border-brand-lightBorder dark:border-brand-darkBorder bg-white/90 dark:bg-brand-darkCard/90 backdrop-blur-md px-4 lg:px-8 py-3 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MsplayLogo variant="horizontal" size="md" />
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {profile && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark text-xs">
                {isAdmin ? (
                  <ShieldCheck className="w-4 h-4 text-brand-red" />
                ) : (
                  <UserCheck className="w-4 h-4 text-green-500" />
                )}
                <span className="font-semibold text-slate-800 dark:text-zinc-200">
                  {profile.nome_completo || profile.email}
                </span>
                <span className="text-slate-400 dark:text-zinc-500">|</span>
                <span className="capitalize font-bold text-brand-red">
                  {profile.role === 'admin' ? 'Administrador' : 'Revendedor'}
                </span>
              </div>
            )}

            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-900/50 transition-all duration-150"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {children}
      </main>

      <footer className="border-t border-brand-lightBorder dark:border-brand-darkBorder py-4 text-center text-xs text-slate-500 dark:text-zinc-500">
        MSPLAY CRM &bull; Plataforma Inteligente de Gestão Comercial e Revenda
      </footer>
    </div>
  );
};