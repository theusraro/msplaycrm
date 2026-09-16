import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: any;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
}) => {
  const finalActionLabel = actionLabel || action?.label;
  const finalActionClick = onAction || action?.onClick;

  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === 'function') {
      const IconComponent = icon as LucideIcon;
      return <IconComponent className="h-6 w-6 text-brand-red" />;
    }
    return null;
  };

  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-brand-lightBorder dark:border-zinc-800 bg-slate-50/50 dark:bg-[#121212]/50 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border border-brand-lightBorder dark:border-zinc-800 text-slate-400 dark:text-zinc-400 mb-4 shadow-sm">
        {renderIcon()}
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mb-4">{description}</p>
      {finalActionLabel && finalActionClick && (
        <button
          onClick={finalActionClick}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-red px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand-red/20 transition-all hover:bg-brand-redHover active:scale-95"
        >
          {finalActionLabel}
        </button>
      )}
    </div>
  );
};
