import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
      className="p-2 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard text-zinc-700 dark:text-zinc-200 hover:border-brand-red dark:hover:border-brand-red transition-all duration-150 flex items-center gap-2 shadow-sm"
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold hidden md:inline">Claro</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-brand-red" />
          <span className="text-xs font-semibold hidden md:inline">Escuro</span>
        </>
      )}
    </button>
  );
};