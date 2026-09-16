import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { logAuditEvent } from '../../services/auditService';
import {
  Settings,
  Save,
  Shield,
  Clock,
  Database,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Bell,
  Smartphone
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    inactivityThresholdDays: 3,
    defaultResellerQuota: 20,
    systemName: 'MSPLAY CRM',
    supportWhatsapp: '(32) 99999-9999',
    autoDistributeOnImport: false,
    requirePhoneFormat: true,
    notifyAdminOnSale: true
  });

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'crm_general_settings')
        .single();

      if (data?.value) {
        setSettings((prev) => ({ ...prev, ...data.value }));
      } else {
        const local = localStorage.getItem('msplay_general_settings');
        if (local) setSettings(JSON.parse(local));
      }
    } catch (err) {
      const local = localStorage.getItem('msplay_general_settings');
      if (local) setSettings(JSON.parse(local));
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      localStorage.setItem('msplay_general_settings', JSON.stringify(settings));

      await supabase.from('system_settings').upsert({
        key: 'crm_general_settings',
        value: settings,
        updated_at: new Date().toISOString()
      });

      await logAuditEvent('update_system_settings', settings);

      addToast('Configurações salvas com sucesso!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Salvo localmente com sucesso', 'success');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-red" /> Configurações Gerais do CRM
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Defina regras de inatividade, cotas padrões, regras de distribuição e parâmetros do sistema.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-brand-red hover:bg-brand-redHover text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Reseller & Activity Rules */}
        <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-red" /> Regras de Atividade & Revendedores
          </h3>

          <div>
            <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
              Dias para considerar Revendedor Inativo
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={settings.inactivityThresholdDays}
              onChange={(e) =>
                setSettings({ ...settings, inactivityThresholdDays: parseInt(e.target.value) || 3 })
              }
              className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark font-bold outline-none focus:ring-2 focus:ring-brand-red"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Revendedores sem interação com leads por este período acionarão alerta amarelo no Dashboard.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
              Cota Padrão de Leads por Novo Revendedor
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={settings.defaultResellerQuota}
              onChange={(e) =>
                setSettings({ ...settings, defaultResellerQuota: parseInt(e.target.value) || 20 })
              }
              className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark font-bold outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="font-bold text-slate-800 dark:text-zinc-200">Distribuir automaticamente ao importar</p>
              <p className="text-[10px] text-slate-400">Atribuir novos contatos importados aos revendedores ativos imediatamente</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoDistributeOnImport}
              onChange={(e) => setSettings({ ...settings, autoDistributeOnImport: e.target.checked })}
              className="w-4 h-4 rounded text-brand-red focus:ring-brand-red"
            />
          </div>
        </div>

        {/* Branding & Contacts Rules */}
        <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand-red" /> Atendimento & Identidade
          </h3>

          <div>
            <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
              Nome da Plataforma CRM
            </label>
            <input
              type="text"
              value={settings.systemName}
              onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark font-bold outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
              WhatsApp Central de Suporte
            </label>
            <input
              type="text"
              value={settings.supportWhatsapp}
              onChange={(e) => setSettings({ ...settings, supportWhatsapp: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark font-bold outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="font-bold text-slate-800 dark:text-zinc-200">Notificar Administrador a cada nova venda</p>
              <p className="text-[10px] text-slate-400">Receber alertas de conversões realizadas pelos revendedores</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyAdminOnSale}
              onChange={(e) => setSettings({ ...settings, notifyAdminOnSale: e.target.checked })}
              className="w-4 h-4 rounded text-brand-red focus:ring-brand-red"
            />
          </div>
        </div>
      </form>
    </div>
  );
};
