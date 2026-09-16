import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Creative, CreativeCategory } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { logAuditEvent } from '../../services/auditService';
import { useToast } from '../../contexts/ToastContext';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Tag,
  Star,
  Flame,
  CheckCircle2,
  Loader2,
  Filter,
  Eye,
  X,
  Upload,
} from 'lucide-react';

export const CreativesView: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal de Upload
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<CreativeCategory>('Feed');
  const [recomendado, setRecomendado] = useState(false);
  const [ofertaAtual, setOfertaAtual] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Confirmação de exclusão
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal de Visualização Ampliada
  const [previewCreative, setPreviewCreative] = useState<Creative | null>(null);

  const fetchCreatives = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('creatives')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreatives(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar criativos:', err);
      toastError(`Erro ao carregar criativos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreatives();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    if (selected) {
      const url = URL.createObjectURL(selected);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const handleUploadCreative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toastError('Selecione uma imagem para o criativo.');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload para o bucket 'creatives'
      const { error: uploadErr } = await supabase.storage.from('creatives').upload(filePath, file);
      if (uploadErr) throw uploadErr;

      // 2. Obter URL pública
      const { data: urlData } = supabase.storage.from('creatives').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // 3. Salvar no banco
      const { data: newRecord, error: dbErr } = await supabase
        .from('creatives')
        .insert({
          titulo,
          descricao,
          imagem_url: publicUrl,
          categoria,
          recomendado,
          oferta_atual: ofertaAtual,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;

      await logAuditEvent({
        acao: 'Upload de Criativo',
        entidade: 'creatives',
        entityId: newRecord?.id,
        detalhes: { titulo, categoria, recomendado, oferta_atual: ofertaAtual },
      });

      success('Criativo cadastrado com sucesso!');
      setIsUploadModalOpen(false);
      setTitulo('');
      setDescricao('');
      setCategoria('Feed');
      setRecomendado(false);
      setOfertaAtual(false);
      setFile(null);
      setFilePreview(null);
      fetchCreatives();
    } catch (err: any) {
      toastError(`Erro ao enviar criativo: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCreative = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('creatives').delete().eq('id', deleteId);
      if (error) throw error;

      await logAuditEvent({
        acao: 'Exclusão de Criativo',
        entidade: 'creatives',
        entityId: deleteId,
      });

      success('Criativo excluído com sucesso!');
      setDeleteId(null);
      fetchCreatives();
    } catch (err: any) {
      toastError(`Erro ao excluir: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCreatives = creatives.filter((c) => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'recomendado') return c.recomendado;
    if (categoryFilter === 'oferta') return c.oferta_atual;
    return c.categoria === categoryFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Gestão de Criativos & Mídia"
        subtitle="Disponibilize banners e materiais de alta conversão para os revendedores personalizarem com seu WhatsApp."
        icon={ImageIcon}
        actions={
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-red px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand-red/20 transition-all hover:bg-brand-redHover active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Criativo</span>
          </button>
        }
      />

      {/* Categorias & Filtros */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold overflow-x-auto">
        {[
          { id: 'all', label: 'Todos os Materiais' },
          { id: 'recomendado', label: '? Recomendados' },
          { id: 'oferta', label: '?? Ofertas Atuais' },
          { id: 'Feed', label: 'Feed' },
          { id: 'Story', label: 'Story' },
          { id: 'Status WhatsApp', label: 'Status WhatsApp' },
          { id: 'Vídeo', label: 'Vídeo' },
          { id: 'Texto', label: 'Texto' },
          { id: 'Oferta', label: 'Oferta Especial' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              categoryFilter === cat.id
                ? 'bg-brand-red text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid de Criativos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-brand-red mx-auto mb-2" />
            Carregando galeria de criativos...
          </div>
        ) : filteredCreatives.length === 0 ? (
          <div className="col-span-full py-16 text-center text-zinc-500 rounded-2xl border border-dashed border-zinc-800 bg-[#121212]">
            Nenhum criativo cadastrado nesta categoria.
          </div>
        ) : (
          filteredCreatives.map((cr) => (
            <div
              key={cr.id}
              className="group rounded-2xl border border-zinc-800 bg-[#121212] overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition shadow-sm"
            >
              {/* Imagem com Overlay de Tags */}
              <div className="relative aspect-video sm:aspect-square bg-zinc-950 overflow-hidden">
                <img
                  src={cr.imagem_url}
                  alt={cr.titulo}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />

                {/* Badges de Categoria e Destaque */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
                  <span className="rounded-lg bg-black/75 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white border border-zinc-700">
                    {cr.categoria}
                  </span>
                  {cr.recomendado && (
                    <span className="rounded-lg bg-amber-500/90 backdrop-blur-md px-2 py-0.5 text-[9px] font-black text-black flex items-center gap-1 shadow">
                      <Star className="w-2.5 h-2.5 fill-black" /> RECOMENDADO
                    </span>
                  )}
                  {cr.oferta_atual && (
                    <span className="rounded-lg bg-brand-red/90 backdrop-blur-md px-2 py-0.5 text-[9px] font-black text-white flex items-center gap-1 shadow">
                      <Flame className="w-2.5 h-2.5 fill-white" /> OFERTA ATUAL
                    </span>
                  )}
                </div>

                {/* Botão de Preview */}
                <button
                  onClick={() => setPreviewCreative(cr)}
                  className="absolute bottom-2.5 right-2.5 rounded-xl bg-black/80 backdrop-blur-md p-2 text-zinc-300 hover:text-white opacity-0 group-hover:opacity-100 transition shadow-lg"
                  title="Visualizar em tamanho real"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              {/* Informações e Ações */}
              <div className="p-4 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="font-bold text-sm text-white mb-1 leading-snug">{cr.titulo}</h3>
                  {cr.descricao && (
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-3">
                      {cr.descricao}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>{new Date(cr.created_at).toLocaleDateString('pt-BR')}</span>
                  <button
                    onClick={() => setDeleteId(cr.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-950/40 transition"
                    title="Excluir criativo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Novo Criativo */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#121212] p-6 shadow-2xl">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand-red" /> Cadastrar Novo Criativo
            </h3>
            <p className="text-xs text-zinc-400 mb-5">
              Envie banners, artes e mídias de alta conversão para os revendedores.
            </p>

            <form onSubmit={handleUploadCreative} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-zinc-300 mb-1">Título do Criativo</label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Banner IPTV 4K - Super Promoção"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white focus:border-brand-red focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">Categoria:</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white focus:border-brand-red focus:outline-none"
                  >
                    <option value="Feed">Feed (Quadrado)</option>
                    <option value="Story">Story (Vertical 9:16)</option>
                    <option value="Status WhatsApp">Status WhatsApp</option>
                    <option value="Vídeo">Vídeo Promocional</option>
                    <option value="Texto">Texto / Copy</option>
                    <option value="Oferta">Oferta Especial</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end gap-2 pb-1">
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recomendado}
                      onChange={(e) => setRecomendado(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-800 text-brand-red focus:ring-0"
                    />
                    <span className="font-semibold">Destacar como Recomendado</span>
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ofertaAtual}
                      onChange={(e) => setOfertaAtual(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-800 text-brand-red focus:ring-0"
                    />
                    <span className="font-semibold">Oferta Ativa do Mês</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Upload da Imagem (PNG / JPG / WEBP)</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  required
                  onChange={handleFileChange}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-red file:text-white hover:file:bg-brand-redHover cursor-pointer"
                />
              </div>

              {filePreview && (
                <div className="p-2 rounded-xl border border-zinc-800 bg-zinc-900">
                  <p className="text-[10px] text-zinc-400 font-bold mb-1">Pré-visualização:</p>
                  <img src={filePreview} alt="Preview" className="h-32 w-full object-contain rounded-lg bg-black" />
                </div>
              )}

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Dica / Legenda de Abordagem para o Revendedor</label>
                <textarea
                  rows={3}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Instruções para o revendedor usar este material..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white focus:border-brand-red focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full rounded-xl bg-brand-red hover:bg-brand-redHover py-3 font-bold text-white shadow-lg shadow-brand-red/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Enviando Imagem...
                    </>
                  ) : (
                    'Salvar Criativo'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Pré-visualização Ampliada */}
      {previewCreative && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative max-w-2xl w-full bg-[#121212] rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
            <button
              onClick={() => setPreviewCreative(null)}
              className="absolute right-4 top-4 rounded-xl bg-black/70 p-2 text-zinc-300 hover:text-white z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewCreative.imagem_url}
              alt={previewCreative.titulo}
              className="w-full max-h-[70vh] object-contain bg-black"
            />
            <div className="p-4 bg-zinc-900/80">
              <h3 className="font-bold text-sm text-white">{previewCreative.titulo}</h3>
              {previewCreative.descricao && (
                <p className="text-xs text-zinc-400 mt-1">{previewCreative.descricao}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Excluir este Criativo?"
        message="Esta arte deixará de ficar disponível na galeria dos revendedores. Deseja prosseguir?"
        confirmLabel="Sim, Excluir"
        isDestructive={true}
        loading={isDeleting}
        onConfirm={handleDeleteCreative}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
