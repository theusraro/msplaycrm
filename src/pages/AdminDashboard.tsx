import React, { useState } from 'react';
import { AdminSidebar, AdminTab } from '../components/admin/AdminSidebar';
import { DashboardView } from './admin/DashboardView';
import { ResellersView } from './admin/ResellersView';
import { LeadsView } from './admin/LeadsView';
import { SalesView } from './admin/SalesView';
import { CreativesView } from './admin/CreativesView';
import { CandidatosView } from './admin/CandidatosView';
import { AiConfigView } from './admin/AiConfigView';
import { AuditView } from './admin/AuditView';
import { SettingsView } from './admin/SettingsView';
import { Menu, ChevronRight } from 'lucide-react';

const TAB_TITLES: Record<AdminTab, string> = {
  dashboard: 'Painel Geral',
  candidatos: 'Candidatos',
  resellers: 'Revendedores',
  leads: 'Gestão de Leads',
  sales: 'Vendas e Faturamento',
  creatives: 'Criativos & Mídia',
  ai_config: 'Inteligência Artificial',
  settings: 'Configurações',
  audit: 'Auditoria de Ações'
};

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Mobile Top Navigation Bar */}
      <div className="lg:hidden flex items-center justify-between bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder p-3 rounded-2xl shadow-sm mb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-brand-dark hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Abrir Menu de Navegação"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Menu Admin
            </span>
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              {TAB_TITLES[activeTab] || 'Painel'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsMobileOpen(true)}
          className="text-xs font-bold text-brand-red bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-xl border border-red-200/40 flex items-center gap-1 min-h-[40px]"
        >
          Navegar <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div className="lg:w-64 shrink-0">
        <AdminSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 min-w-0">
        {activeTab === 'dashboard' && <DashboardView onNavigateTab={(tab) => setActiveTab(tab as AdminTab)} />}
        {activeTab === 'resellers' && <ResellersView />}
        {activeTab === 'leads' && <LeadsView />}
        {activeTab === 'sales' && <SalesView />}
        {activeTab === 'creatives' && <CreativesView />}
        {activeTab === 'candidatos' && <CandidatosView />}
        {activeTab === 'ai_config' && <AiConfigView />}
        {activeTab === 'audit' && <AuditView />}
        {activeTab === 'settings' && <SettingsView />}
      </div>
    </div>
  );
};