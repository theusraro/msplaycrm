import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { logAuditEvent } from '../../services/auditService';
import { Candidate } from '../../types';
import {
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  MessageCircle,
  ShieldCheck
} from 'lucide-react';

export const CandidatosView: React.FC = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendente' | 'aprovado' | 'rejeitado'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCandidates(data || []);
    } catch (err: any) {
      addToast(err.message || 'Erro ao carregar candidatos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (candidate: Candidate) => {
    setProcessingId(candidate.id);
    try {
      // 1. Update candidate status
      const { error: candErr } = await supabase
        .from('candidates')
        .update({ status: 'aprovado' })
        .eq('id', candidate.id);

      if (candErr) throw candErr;

      // 2. Create / ensure reseller profile exists or trigger invitation
      await logAuditEvent('approve_candidate', {
        candidate_id: candidate.id,
        nome: candidate.nome,
        email: candidate.email
      });

      addToast(`Candidato ${candidate.nome} aprovado com sucesso!`, 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao aprovar candidato', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (candidate: Candidate) => {
    if (!confirm(`Deseja rejeitar a candidatura de ${candidate.nome}?`)) return;

    setProcessingId(candidate.id);
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ status: 'rejeitado' })
        .eq('id', candidate.id);

      if (error) throw error;

      await logAuditEvent('reject_candidate', {
        candidate_id: candidate.id,
        nome: candidate.nome
      });

      addToast('Candidatura rejeitada', 'info');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao rejeitar candidato', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    const matchSearch =
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telefone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'all' || c.status === statusFilter;

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-brand-red" /> Gestão de Candidatos a Revendedor
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Analise e aprove novas solicitações de revenda recebidas pela página de captação.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 text-xs font-semibold rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-brand-dark p-1 rounded-xl text-xs font-bold w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'all' ? 'bg-white dark:bg-brand-darkCard text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
          >
            Todos ({candidates.length})
          </button>
          <button
            onClick={() => setStatusFilter('pendente')}
            className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'pendente' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500'}`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setStatusFilter('aprovado')}
            className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'aprovado' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-500'}`}
          >
            Aprovados
          </button>
          <button
            onClick={() => setStatusFilter('rejeitado')}
            className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'rejeitado' ? 'bg-red-500 text-white shadow-xs' : 'text-slate-500'}`}
          >
            Rejeitados
          </button>
        </div>
      </div>

      {/* Candidates List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCandidates.map((c) => (
          <div
            key={c.id}
            className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-5 shadow-sm flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-brand-red/10 text-brand-red font-black text-sm flex items-center justify-center">
                  {c.nome.charAt(0).toUpperCase()}
                </div>
                <StatusBadge
                  status={c.status === 'aprovado' ? 'active' : c.status === 'rejeitado' ? 'inactive' : 'moderate'}
                  text={c.status === 'aprovado' ? 'Aprovado' : c.status === 'rejeitado' ? 'Rejeitado' : 'Pendente'}
                />
              </div>

              <h3 className="font-bold text-sm text-slate-900 dark:text-white">{c.nome}</h3>

              <div className="space-y-1.5 mt-3 text-xs text-slate-500 dark:text-zinc-400">
                <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> {c.email}</p>
                <p className="flex items-center gap-2 font-mono"><Phone className="w-3.5 h-3.5 text-slate-400" /> {c.telefone}</p>
                {(c.cidade || c.estado) && (
                  <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {c.cidade} - {c.estado}</p>
                )}
                {c.experiencia && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-brand-dark border border-brand-lightBorder dark:border-brand-darkBorder text-[11px] italic">
                    "{c.experiencia}"
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-brand-lightBorder dark:border-brand-darkBorder flex items-center justify-between gap-2">
              <a
                href={`https://wa.me/${c.telefone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Chamar WhatsApp
              </a>

              {c.status === 'pendente' && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleReject(c)}
                    disabled={processingId === c.id}
                    className="p-2 rounded-xl border border-red-200 bg-red-50 text-red-600 dark:bg-red-950/30 dark:border-red-800 hover:bg-red-100 transition"
                    title="Rejeitar Candidatura"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleApprove(c)}
                    disabled={processingId === c.id}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredCandidates.length === 0 && (
        <EmptyState
          icon={<UserPlus className="w-8 h-8 text-slate-400" />}
          title="Nenhum candidato encontrado"
          description="Nenhuma candidatura corresponde aos filtros atuais."
        />
      )}
    </div>
  );
};
