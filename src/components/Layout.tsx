import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { LogOut, ShieldCheck, UserCheck, Flame } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, signOut, isAdmin } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b border-brand-lightBorder dark:border-brand-darkBorder bg-white/90 dark:bg-brand-darkCard/90 backdrop-blur-md px-4 lg:px-8 py-3 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-red p-2 rounded-xl text-white shadow-md shadow-brand-red/20">
              <Flame className="w-6 h-6 fill-white" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-wider text-brand-red">
                MSPLAY
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-brand-red/10 text-brand-red dark:bg-brand-red/20">
                CRM & IA
              </span>
            </div>
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
                  {profile.nome}
                </span>
                <span className="text-slate-400 dark:text-zinc-500">|</span>
                <span className="capitalize font-bold text-brand-red">
                  {profile.role}
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
        MSPLAY WhatsApp CRM &bull; Plataforma Multi-Revendedor Inteligente
      </footer>
    </div>
  );
};