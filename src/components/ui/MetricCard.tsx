import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  accentColor?: string;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'text-brand-red',
  loading = false,
}) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-[#121212] p-5 shadow-sm transition-all duration-200 hover:border-zinc-700 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{title}</span>
        <div className={`rounded-xl bg-zinc-900/90 p-2.5 ring-1 ring-zinc-800 transition-colors group-hover:ring-zinc-700 ${accentColor}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-zinc-800"></div>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-white sm:text-3xl">{value}</span>
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

        {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-red/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
    </div>
  );
};
