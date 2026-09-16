import React, { useState } from 'react';
import { AdminSidebar, AdminViewType } from '../components/admin/AdminSidebar';
import { DashboardView } from './admin/DashboardView';
import { ResellersView } from './admin/ResellersView';
import { LeadsView } from './admin/LeadsView';
import { SalesView } from './admin/SalesView';
import { CreativesView } from './admin/CreativesView';
import { AiConfigView } from './admin/AiConfigView';
import { SettingsView } from './admin/SettingsView';
import { AuditView } from './admin/AuditView';
import { CandidatosView } from './admin/CandidatosView';
import { Menu, Flame } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState<AdminViewType>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onNavigate={(view) => setCurrentView(view)} />;
      case 'resellers':
        return <ResellersView />;
      case 'leads':
        return <LeadsView />;
      case 'sales':
        return <SalesView />;
      case 'creatives':
        return <CreativesView />;
      case 'ai_config':
        return <AiConfigView />;
      case 'settings':
        return <SettingsView />;
      case 'audit':
        return <AuditView />;
      case 'candidatos':
        return <CandidatosView />;
      default:
        return <DashboardView onNavigate={(view) => setCurrentView(view)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col lg:flex-row">
      {/* Sidebar (Desktop + Mobile Drawer) */}
      <AdminSidebar
        currentView={currentView}
        onSelectView={(view) => setCurrentView(view)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile Topbar */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-[#0e0e0e] sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-red text-white">
                <Flame className="h-4 w-4 fill-white" />
              </div>
              <span className="font-black text-sm tracking-wider text-brand-red">MSPLAY</span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider capitalize">
            {currentView.replace('_', ' ')}
          </span>
        </header>

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
};
