import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { UserPlus, Sparkles, Clock, ArrowRight, Shield } from 'lucide-react';

export const CandidatosView: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Gestão de Candidatos a Revendedor"
        subtitle="Funil de captação e aprovação de novos interessados em revender MSPLAY."
        icon={UserPlus}
      />

      <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-red/10 border border-brand-red/20 text-brand-red mx-auto">
          <UserPlus className="h-8 w-8" />
        </div>

        <h3 className="text-lg font-black text-white">Módulo em Preparação: Captação de Revendedores</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Esta área integrará formulários externos de cadastro (Landing page de recrutamento) diretamente ao CRM para triagem, aprovação com 1 clique e onboarding automático via WhatsApp.
        </p>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-left text-xs text-zinc-300 space-y-2">
          <p className="font-bold text-brand-red flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Próxima Fase de Implementação:
          </p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>Tabela dedicada <code className="text-zinc-200 font-mono">candidates</code> no Supabase</li>
            <li>Webhook de entrada para formulários de captura</li>
            <li>Fluxo de aprovação rápida convertendo candidato em revendedor ativo</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
