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

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar Navigation */}
      <div className="lg:w-64 shrink-0">
        <AdminSidebar activeTab={activeTab} onSelectTab={setActiveTab} />
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