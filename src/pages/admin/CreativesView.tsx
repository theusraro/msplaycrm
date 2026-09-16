import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { EmptyState } from '../../components/ui/EmptyState';
import { logAuditEvent } from '../../services/auditService';
import { Creative } from '../../types';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  X,
  CheckCircle2,
  Tag
} from 'lucide-react';

export const CreativesView: React.FC = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creatives, setCreatives] = useState<Creative[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCreative, setNewCreative] = useState({
    titulo: '',
    descricao: '',
    imagem_url: '',
    categoria: 'Geral'
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('creatives')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreatives(data || []);
    } catch (err: any) {
      addToast(err.message || 'Erro ao carregar criativos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCreative.titulo || !newCreative.imagem_url) {
      addToast('Título e URL da imagem são obrigatórios', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('creatives')
        .insert([
          {
            titulo: newCreative.titulo,
            descricao: newCreative.descricao,
            imagem_url: newCreative.imagem_url,
            categoria: newCreative.categoria,
            ativo: true
          }
        ])
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent('create_creative', {
        creative_id: data.id,
        titulo: data.titulo
      });

      addToast('Criativo cadastrado com sucesso!', 'success');
      setShowCreateModal(false);
      setNewCreative({ titulo: '', descricao: '', imagem_url: '', categoria: 'Geral' });
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao cadastrar criativo', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, titulo: string) => {
    if (!confirm(`Deseja realmente remover o criativo "${titulo}"?`)) return;

    try {
      const { error } = await supabase.from('creatives').delete().eq('id', id);
      if (error) throw error;

      await logAuditEvent('delete_creative', { creative_id: id, titulo });
      addToast('Criativo excluído com sucesso', 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao excluir criativo', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-brand-red" /> Galeria de Criativos & Mídia
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Cadastre artes e banners para que seus revendedores façam o download com o WhatsApp deles estampado automaticamente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-xs font-semibold rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard text-slate-700 dark:text-zinc-300 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-brand-red hover:bg-brand-redHover text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Criativo
          </button>
        </div>
      </div>

      {/* Creatives Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {creatives.map((c) => (
          <div
            key={c.id}
            className="border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl bg-white dark:bg-brand-darkCard overflow-hidden shadow-sm flex flex-col justify-between group"
          >
            <div className="relative h-48 bg-slate-100 dark:bg-brand-dark overflow-hidden">
              <img
                src={c.imagem_url}
                alt={c.titulo}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1">
                  <Tag className="w-3 h-3 text-brand-red" /> {c.categoria || 'Geral'}
                </span>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{c.titulo}</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
                  {c.descricao || 'Criativo de alta conversão para redes sociais e status.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-brand-lightBorder dark:border-brand-darkBorder flex items-center justify-between">
                <a
                  href={c.imagem_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-brand-red hover:underline flex items-center gap-1"
                >
                  Abrir Original <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  onClick={() => handleDelete(c.id, c.titulo)}
                  className="p-1.5 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 text-slate-400 transition"
                  title="Excluir Criativo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {creatives.length === 0 && (
        <EmptyState
          icon={<ImageIcon className="w-8 h-8 text-slate-400" />}
          title="Nenhum criativo cadastrado"
          description="Cadastre imagens para que os revendedores possam divulgar nos status e redes sociais."
          actionLabel="Adicionar Criativo"
          onAction={() => setShowCreateModal(true)}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-brand-lightBorder dark:border-brand-darkBorder">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-red" /> Cadastrar Criativo
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Título do Post / Banner
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Banner Promoção Futebol HD"
                  value={newCreative.titulo}
                  onChange={(e) => setNewCreative({ ...newCreative, titulo: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  URL Direta da Imagem (JPEG/PNG/WebP)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={newCreative.imagem_url}
                  onChange={(e) => setNewCreative({ ...newCreative, imagem_url: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  placeholder="Ex: Futebol, Séries, Promoções, Ofertas"
                  value={newCreative.categoria}
                  onChange={(e) => setNewCreative({ ...newCreative, categoria: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Descrição / Instruções para o Revendedor
                </label>
                <textarea
                  rows={3}
                  placeholder="Excelente para postar nos stories do WhatsApp em dias de jogo."
                  value={newCreative.descricao}
                  onChange={(e) => setNewCreative({ ...newCreative, descricao: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-brand-lightBorder dark:border-brand-darkBorder">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder text-slate-600 dark:text-zinc-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-redHover text-white font-bold disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Cadastrar Criativo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
