import React, { useState } from 'react';
import { Activity, MessageSquare, PhoneCall } from 'lucide-react';

interface DailyActivityPoint {
  date: string;
  displayDate: string;
  messages: number;
  assignments: number;
}

interface ActivityTimelineChartProps {
  data: DailyActivityPoint[];
}

export const ActivityTimelineChart: React.FC<ActivityTimelineChartProps> = ({ data }) => {
  const [hovered, setHovered] = useState<DailyActivityPoint | null>(null);

  const totalMessages = data.reduce((acc, d) => acc + d.messages, 0);
  const totalAssignments = data.reduce((acc, d) => acc + d.assignments, 0);
  const maxTotal = Math.max(...data.map((d) => d.messages + d.assignments), 1);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-red" /> Atividade & Disparos da Equipe
          </h3>
          <p className="text-xs text-zinc-400">Mensagens geradas por IA e leads trabalhados</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-red"></span>
            <span className="text-zinc-400">Mensagens IA ({totalMessages})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-500"></span>
            <span className="text-zinc-400">Atribuições ({totalAssignments})</span>
          </div>
        </div>
      </div>

      {data.length === 0 || (totalMessages === 0 && totalAssignments === 0) ? (
        <div className="flex h-44 items-center justify-center text-center text-xs text-zinc-500">
          Nenhuma atividade registrada no período.
        </div>
      ) : (
        <div className="relative pt-6">
          {hovered && (
            <div className="absolute top-0 right-4 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs shadow-xl animate-in fade-in duration-100 z-10">
              <span className="text-zinc-400 font-medium">{hovered.displayDate}:</span>{' '}
              <span className="text-brand-red font-bold">{hovered.messages} msgs</span> |{' '}
              <span className="text-sky-400 font-bold">{hovered.assignments} leads</span>
            </div>
          )}

          <div className="flex h-40 items-end gap-1 sm:gap-1.5 w-full pt-4">
            {data.map((point, index) => {
              const total = point.messages + point.assignments;
              const heightPercent = Math.max((total / maxTotal) * 100, total > 0 ? 8 : 2);
              const isHovered = hovered?.date === point.date;

              return (
                <div
                  key={index}
                  onMouseEnter={() => setHovered(point)}
                  onMouseLeave={() => setHovered(null)}
                  className="group relative flex flex-1 flex-col items-center h-full justify-end cursor-pointer"
                >
                  <div
                    className={`w-full rounded-t-md transition-all duration-200 overflow-hidden flex flex-col justify-end ${
                      isHovered ? 'brightness-125' : ''
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  >
                    {point.messages > 0 && (
                      <div
                        className="w-full bg-brand-red"
                        style={{ height: `${(point.messages / (total || 1)) * 100}%` }}
                      ></div>
                    )}
                    {point.assignments > 0 && (
                      <div
                        className="w-full bg-sky-500"
                        style={{ height: `${(point.assignments / (total || 1)) * 100}%` }}
                      ></div>
                    )}
                    {total === 0 && <div className="w-full h-full bg-zinc-800/40"></div>}
                  </div>
                </div>
              );
            })}
          </div>

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
