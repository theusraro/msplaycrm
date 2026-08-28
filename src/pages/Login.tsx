import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { Flame, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const { error } = await signIn(email, password);

    if (error) {
      setErrorMsg('E-mail ou senha incorretos. Verifique suas credenciais.');
      setIsSubmitting(false);
    } else {
      // O App.tsx lida com o redirecionamento com base no profile
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 relative bg-brand-light dark:bg-brand-dark">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard rounded-2xl p-8 shadow-xl relative overflow-hidden transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-red"></div>

          <div className="flex flex-col items-center text-center mb-8">
            <div className="bg-brand-red p-3 rounded-2xl text-white shadow-lg shadow-brand-red/30 mb-3">
              <Flame className="w-8 h-8 fill-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-brand-red">
              MSPLAY
            </h1>
            <p className="text-xs uppercase tracking-widest font-bold text-slate-500 dark:text-zinc-400 mt-1">
              WhatsApp CRM & IA Engine
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="revendedor@msplay.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-brand-red hover:bg-brand-redHover text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-red/25 active:scale-[0.98] transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-zinc-500 mt-6">
          Acessos liberados e gerenciados centralmente pelo Administrador MSPLAY.
        </p>
      </div>
    </div>
  );
};