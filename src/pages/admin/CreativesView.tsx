import React, { useState, useEffect, useRef } from 'react';
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
  Upload,
  Link,
  Tag,
  UploadCloud,
  FileImage,
  AlertCircle
} from 'lucide-react';

const PRESET_CATEGORIES = [
  'Geral',
  'Futebol',
  'Filmes & Séries',
  'Promoções',
  'Status WhatsApp',
  'Feed Instagram',
  'Ofertas'
];

export const CreativesView: React.FC = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creatives, setCreatives] = useState<Creative[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [newCreative, setNewCreative] = useState({
    titulo: '',
    descricao: '',
    imagem_url: '',
    categoria: 'Geral'
  });
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      addToast('Formato de arquivo inválido. Use PNG, JPG, JPEG ou WebP.', 'warning');
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      addToast('A imagem deve ter no máximo 10MB.', 'warning');
      return;
    }

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const resetModal = () => {
    setShowCreateModal(false);
    setInputMode('upload');
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    setNewCreative({ titulo: '', descricao: '', imagem_url: '', categoria: 'Geral' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCreative.titulo.trim()) {
      addToast('Informe o título do criativo', 'warning');
      return;
    }

    if (inputMode === 'upload' && !selectedFile) {
      addToast('Selecione uma imagem do computador para upload', 'warning');
      return;
    }

    if (inputMode === 'url' && !newCreative.imagem_url.trim()) {
      addToast('Informe a URL direta da imagem', 'warning');
      return;
    }

    setSubmitting(true);
    let finalImageUrl = newCreative.imagem_url.trim();

    try {
      if (inputMode === 'upload' && selectedFile) {
        // Generate clean unique filename
        const ext = selectedFile.name.split('.').pop() || 'png';
        const cleanName = selectedFile.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `${Date.now()}_${cleanName}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('creatives')
          .upload(fileName, selectedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Erro no Supabase Storage:', uploadError);
          throw new Error(
            `Falha no upload para o Storage: ${uploadError.message}. Verifique se o bucket "creatives" existe e é público no Supabase, ou utilize a opção "Informar Link".`
          );
        }

        const { data: publicUrlData } = supabase.storage
          .from('creatives')
          .getPublicUrl(fileName);

        if (!publicUrlData?.publicUrl) {
          throw new Error('Não foi possível obter o link público da imagem enviada.');
        }

        finalImageUrl = publicUrlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('creatives')
        .insert([
          {
            titulo: newCreative.titulo.trim(),
            descricao: newCreative.descricao.trim(),
            imagem_url: finalImageUrl,
            categoria: newCreative.categoria || 'Geral',
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
      resetModal();
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
            Cadastre artes via upload de arquivo ou link externo para que seus revendedores façam o download com o WhatsApp deles estampado automaticamente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-xs font-semibold rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard text-slate-700 dark:text-zinc-300 shadow-sm hover:bg-slate-50 dark:hover:bg-brand-dark"
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
                onError={(e) => {
                  // Fallback se URL falhar
                  (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/18181b/ffffff?text=Imagem+Nao+Disponivel';
                }}
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

      {creatives.length === 0 && !loading && (
        <EmptyState
          icon={<ImageIcon className="w-8 h-8 text-slate-400" />}
          title="Nenhum criativo cadastrado"
          description="Cadastre imagens via upload ou link para que os revendedores possam divulgar nos status e redes sociais."
          actionLabel="Adicionar Criativo"
          onAction={() => setShowCreateModal(true)}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-brand-lightBorder dark:border-brand-darkBorder">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-red" /> Cadastrar Criativo
              </h3>
              <button onClick={resetModal} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex bg-slate-100 dark:bg-brand-dark p-1 rounded-xl mt-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
                  inputMode === 'upload'
                    ? 'bg-white dark:bg-brand-darkCard text-brand-red shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                }`}
              >
                <Upload className="w-4 h-4" /> Fazer Upload do Computador
              </button>
              <button
                type="button"
                onClick={() => setInputMode('url')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
                  inputMode === 'url'
                    ? 'bg-white dark:bg-brand-darkCard text-brand-red shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                }`}
              >
                <Link className="w-4 h-4" /> Informar Link / URL
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Título do Post / Banner <span className="text-brand-red">*</span>
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

              {/* Upload Mode Area */}
              {inputMode === 'upload' ? (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Arquivo de Imagem (PNG, JPG, JPEG, WebP) <span className="text-brand-red">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />

                  {filePreview ? (
                    <div className="relative border-2 border-brand-lightBorder dark:border-brand-darkBorder rounded-xl overflow-hidden bg-slate-50 dark:bg-brand-dark">
                      <img
                        src={filePreview}
                        alt="Prévia"
                        className="w-full h-44 object-contain bg-black/5 dark:bg-black/30"
                      />
                      <div className="p-2.5 bg-white dark:bg-brand-darkCard border-t border-brand-lightBorder dark:border-brand-darkBorder flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate text-slate-700 dark:text-zinc-300">
                          <FileImage className="w-4 h-4 text-brand-red shrink-0" />
                          <span className="truncate font-semibold">{selectedFile?.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            ({selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB' : ''})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            if (filePreview) URL.revokeObjectURL(filePreview);
                            setFilePreview(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-xs text-red-500 font-bold hover:underline shrink-0 ml-2"
                        >
                          Trocar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-brand-lightBorder dark:border-brand-darkBorder hover:border-brand-red dark:hover:border-brand-red rounded-xl p-6 text-center cursor-pointer bg-slate-50 dark:bg-brand-dark/50 transition flex flex-col items-center justify-center gap-2"
                    >
                      <div className="w-10 h-10 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-slate-700 dark:text-zinc-200">
                        Clique para selecionar ou arraste o arquivo aqui
                      </p>
                      <p className="text-[11px] text-slate-400">
                        PNG, JPG, JPEG ou WebP (Máx. 10MB)
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* URL Mode Area */
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    URL Direta da Imagem <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://exemplo.com/imagem.png"
                    value={newCreative.imagem_url}
                    onChange={(e) => setNewCreative({ ...newCreative, imagem_url: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
                  />

                  {newCreative.imagem_url && (
                    <div className="mt-2 border border-brand-lightBorder dark:border-brand-darkBorder rounded-xl overflow-hidden bg-slate-50 dark:bg-brand-dark p-1">
                      <p className="text-[10px] font-bold text-slate-400 px-2 py-1">Prévia do Link:</p>
                      <img
                        src={newCreative.imagem_url}
                        alt="Prévia URL"
                        className="w-full h-36 object-contain rounded-lg bg-black/5 dark:bg-black/30"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/600x300/18181b/ef4444?text=URL+Invalida+ou+Inacessivel';
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Categoria
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCreative({ ...newCreative, categoria: cat })}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        newCreative.categoria === cat
                          ? 'bg-brand-red text-white'
                          : 'bg-slate-100 dark:bg-brand-dark text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Ou digite uma categoria personalizada"
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
                  rows={2}
                  placeholder="Excelente para postar nos stories do WhatsApp em dias de jogo."
                  value={newCreative.descricao}
                  onChange={(e) => setNewCreative({ ...newCreative, descricao: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-brand-lightBorder dark:border-brand-darkBorder">
                <button
                  type="button"
                  onClick={resetModal}
                  className="px-4 py-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder text-slate-600 dark:text-zinc-300 font-bold hover:bg-slate-50 dark:hover:bg-brand-dark"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-redHover text-white font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    'Cadastrar Criativo'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
