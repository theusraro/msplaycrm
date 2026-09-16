import React, { useState } from 'react';
import { TrendingUp, DollarSign } from 'lucide-react';

interface DailySalePoint {
  date: string;       // YYYY-MM-DD
  displayDate: string;// DD/MM
  count: number;
  totalValue: number;
}

interface SalesTimelineChartProps {
  data: DailySalePoint[];
}

export const SalesTimelineChart: React.FC<SalesTimelineChartProps> = ({ data }) => {
  const [hoveredPoint, setHoveredPoint] = useState<DailySalePoint | null>(null);

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalPeriodSales = data.reduce((acc, d) => acc + d.count, 0);
  const totalPeriodValue = data.reduce((acc, d) => acc + d.totalValue, 0);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-red" /> Vendas nos Últimos 30 Dias
          </h3>
          <p className="text-xs text-zinc-400">Desempenho diário de conversões</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="text-right">
            <span className="text-zinc-500 block text-[10px] uppercase">Total Vendas</span>
            <span className="text-emerald-400 text-sm font-black">{totalPeriodSales} un</span>
          </div>
          {totalPeriodValue > 0 && (
            <div className="text-right border-l border-zinc-800 pl-4">
              <span className="text-zinc-500 block text-[10px] uppercase">Faturamento</span>
              <span className="text-emerald-400 text-sm font-black">
                R$ {totalPeriodValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </div>

      {data.length === 0 || totalPeriodSales === 0 ? (
        <div className="flex h-48 items-center justify-center text-center text-xs text-zinc-500">
          Nenhuma venda registrada nos últimos 30 dias.
        </div>
      ) : (
        <div className="relative pt-6">
          {/* Tooltip interativo */}
          {hoveredPoint && (
            <div className="absolute top-0 right-4 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs shadow-xl animate-in fade-in duration-100 z-10">
              <span className="text-zinc-400 font-medium">{hoveredPoint.displayDate}:</span>{' '}
              <span className="font-bold text-white">{hoveredPoint.count} vendas</span>
              {hoveredPoint.totalValue > 0 && (
                <span className="text-emerald-400 ml-1.5 font-bold">
                  (R$ {hoveredPoint.totalValue.toFixed(2)})
                </span>
              )}
            </div>
          )}

          {/* Barras do Gráfico */}
          <div className="flex h-44 items-end gap-1 sm:gap-1.5 w-full pt-4">
            {data.map((point, index) => {
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
                        : 'bg-zinc-800/40'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  ></div>
                </div>
              );
            })}
          </div>

          {/* Eixo X com labels selecionadas */}
          <div className="flex justify-between text-[10px] text-zinc-500 font-semibold mt-2 pt-2 border-t border-zinc-800">
            <span>{data[0]?.displayDate || 'Início'}</span>
            <span>{data[Math.floor(data.length / 2)]?.displayDate || 'Meio'}</span>
            <span>{data[data.length - 1]?.displayDate || 'Hoje'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
