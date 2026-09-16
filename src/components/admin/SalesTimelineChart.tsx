import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Sale } from '../../types';

export interface DailySalePoint {
  date: string;
  displayDate: string;
  count: number;
  totalValue: number;
}

export interface SalesTimelineChartProps {
  data?: DailySalePoint[];
  sales?: Sale[];
  days?: number;
}

export const SalesTimelineChart: React.FC<SalesTimelineChartProps> = ({ data: propData, sales = [], days = 30 }) => {
  const [hoveredPoint, setHoveredPoint] = useState<DailySalePoint | null>(null);

  let chartPoints: DailySalePoint[] = [];

  if (propData && propData.length > 0) {
    chartPoints = propData;
  } else {
    // Generate daily points for the last `days` days
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const displayDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      const daySales = sales.filter((s) => s.created_at?.startsWith(dateStr));
      const count = daySales.length;
      const totalValue = daySales.reduce((acc, s) => acc + Number(s.valor || 0), 0);

      chartPoints.push({
        date: dateStr,
        displayDate,
        count,
        totalValue,
      });
    }
  }

  const maxCount = Math.max(...chartPoints.map((d) => d.count), 1);
  const totalPeriodSales = chartPoints.reduce((acc, d) => acc + d.count, 0);
  const totalPeriodValue = chartPoints.reduce((acc, d) => acc + d.totalValue, 0);

  return (
    <div className="rounded-2xl border border-brand-lightBorder dark:border-zinc-800 bg-white dark:bg-[#121212] p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-red" /> Vendas nos Últimos {days} Dias
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Desempenho diário de conversões</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="text-right">
            <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase">Total Vendas</span>
            <span className="text-emerald-500 dark:text-emerald-400 text-sm font-black">{totalPeriodSales} un</span>
          </div>
          {totalPeriodValue > 0 && (
            <div className="text-right border-l border-brand-lightBorder dark:border-zinc-800 pl-4">
              <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase">Faturamento</span>
              <span className="text-emerald-500 dark:text-emerald-400 text-sm font-black">
                R$ {totalPeriodValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </div>

      {chartPoints.length === 0 || totalPeriodSales === 0 ? (
        <div className="flex h-48 items-center justify-center text-center text-xs text-slate-400 dark:text-zinc-500">
          Nenhuma venda registrada nos últimos {days} dias.
        </div>
      ) : (
        <div className="relative pt-6">
          {hoveredPoint && (
            <div className="absolute top-0 right-4 rounded-xl border border-brand-lightBorder dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs shadow-xl animate-in fade-in duration-100 z-10">
              <span className="text-slate-500 dark:text-zinc-400 font-medium">{hoveredPoint.displayDate}:</span>{' '}
              <span className="font-bold text-slate-900 dark:text-white">{hoveredPoint.count} vendas</span>
              {hoveredPoint.totalValue > 0 && (
                <span className="text-emerald-500 dark:text-emerald-400 ml-1.5 font-bold">
                  (R$ {hoveredPoint.totalValue.toFixed(2)})
                </span>
              )}
            </div>
          )}

          <div className="flex h-44 items-end gap-1 sm:gap-1.5 w-full pt-4">
            {chartPoints.map((point, index) => {
              const heightPercent = Math.max((point.count / maxCount) * 100, point.count > 0 ? 8 : 2);
              const isHovered = hoveredPoint?.date === point.date;

              return (
                <div
                  key={index}
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="group relative flex flex-1 flex-col items-center h-full justify-end cursor-pointer"
                >
                  <div
                    className={`w-full rounded-t-md transition-all duration-200 ${
                      point.count > 0
                        ? isHovered
                          ? 'bg-brand-red'
                          : 'bg-brand-red/70 group-hover:bg-brand-red'
                        : 'bg-slate-200 dark:bg-zinc-800/40'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  ></div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 dark:text-zinc-500 font-semibold mt-2 pt-2 border-t border-brand-lightBorder dark:border-zinc-800">
            <span>{chartPoints[0]?.displayDate || 'Início'}</span>
            <span>{chartPoints[Math.floor(chartPoints.length / 2)]?.displayDate || 'Meio'}</span>
            <span>{chartPoints[chartPoints.length - 1]?.displayDate || 'Hoje'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
