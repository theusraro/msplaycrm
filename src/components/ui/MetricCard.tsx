import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  accentColor?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  accentColor,
  variant = 'default',
  loading = false,
}) => {
  let defaultAccent = 'text-brand-red';
  if (variant === 'success') defaultAccent = 'text-emerald-500';
  if (variant === 'warning') defaultAccent = 'text-amber-500';
  if (variant === 'danger') defaultAccent = 'text-rose-500';

  const finalAccent = accentColor || defaultAccent;

  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === 'function') {
      const IconComponent = icon as LucideIcon;
      return <IconComponent className="h-5 w-5" />;
    }
    return null;
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-brand-lightBorder dark:border-zinc-800 bg-white dark:bg-[#121212] p-5 shadow-sm transition-all duration-200 hover:border-brand-red/30 dark:hover:border-zinc-700 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">{title}</span>
        <div className={`rounded-xl bg-slate-100 dark:bg-zinc-900/90 p-2.5 ring-1 ring-brand-lightBorder dark:ring-zinc-800 transition-colors ${finalAccent}`}>
          {renderIcon()}
        </div>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-slate-200 dark:bg-zinc-800"></div>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">{value}</span>
            {trend && (
              <span
                className={`flex items-center gap-0.5 text-xs font-bold ${
                  trend.isPositive ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {trend.isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}
              </span>
            )}
          </div>
        )}

        {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">{subtitle}</p>}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-red/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
    </div>
  );
};
