import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Inbox,
  ShoppingBag,
  Image as ImageIcon,
  Bot,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Flame,
  X,
} from 'lucide-react';

export type AdminTab =
  | 'dashboard'
  | 'candidatos'
  | 'resellers'
  | 'leads'
  | 'sales'
  | 'creatives'
  | 'ai_config'
  | 'settings'
  | 'audit';

export type AdminViewType = AdminTab;

export interface AdminSidebarProps {
  activeTab?: AdminTab;
  onSelectTab?: (tab: AdminTab) => void;
  currentView?: AdminViewType;
  onSelectView?: (view: AdminViewType) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  currentView,
  onSelectView,
  isCollapsed: externalIsCollapsed,
  onToggleCollapse: externalOnToggleCollapse,
  isMobileOpen: externalIsMobileOpen = false,
  onCloseMobile: externalOnCloseMobile,
}) => {
  const { profile, signOut } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const selectedTab = activeTab || currentView || 'dashboard';
  const handleSelectTab = (tab: AdminTab) => {
    if (onSelectTab) onSelectTab(tab);
    if (onSelectView) onSelectView(tab);
    if (externalOnCloseMobile) externalOnCloseMobile();
  };

  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalCollapsed;
  const toggleCollapse = externalOnToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));

  const navSections = [
    {
      title: 'VISÃO GERAL',
      items: [
        { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'OPERAÇÃO',
      items: [
        { id: 'candidatos' as AdminTab, label: 'Candidatos', icon: UserPlus },
        { id: 'resellers' as AdminTab, label: 'Revendedores', icon: Users },
        { id: 'leads' as AdminTab, label: 'Leads', icon: Inbox },
        { id: 'sales' as AdminTab, label: 'Vendas', icon: ShoppingBag },
      ],
    },
    {
      title: 'CONTEÚDO',
      items: [
        { id: 'creatives' as AdminTab, label: 'Criativos', icon: ImageIcon },
      ],
    },
    {
      title: 'SISTEMA',
      items: [
        { id: 'ai_config' as AdminTab, label: 'Inteligência Artificial', icon: Bot },
        { id: 'settings' as AdminTab, label: 'Configurações', icon: Settings },
        { id: 'audit' as AdminTab, label: 'Auditoria', icon: ShieldCheck },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-[#0e0e0e] border-r border-brand-lightBorder dark:border-zinc-800/90 select-none">
      <div>
        <div className="flex items-center justify-between p-4 border-b border-brand-lightBorder dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-red text-white shadow-lg shadow-brand-red/20">
              <Flame className="h-5 w-5 fill-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-base font-black tracking-wider text-brand-red">
                  MSPLAY
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                  ADMIN CRM
                </span>
              </div>
            )}
          </div>

          <button
            onClick={toggleCollapse}
            className="hidden lg:flex rounded-lg p-1.5 text-slate-400 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition"
            title={isCollapsed ? 'Expandir' : 'Recolher'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {externalOnCloseMobile && (
            <button
              onClick={externalOnCloseMobile}
              className="lg:hidden rounded-lg p-1.5 text-slate-400 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-160px)]">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                  {section.title}
                </span>
              )}
              <div className="space-y-1 pt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = selectedTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-150 relative ${
                        isActive
                          ? 'bg-brand-red text-white shadow-md shadow-brand-red/20'
                          : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-100'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-zinc-400 group-hover:text-brand-red'}`} />
                      {!isCollapsed && (
                        <div className="flex flex-1 items-center justify-between overflow-hidden">
                          <span className="truncate">{item.label}</span>
                        </div>
                      )}
                      {isActive && isCollapsed && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 h-2 w-1 rounded-full bg-brand-red"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="p-3 border-t border-brand-lightBorder dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950/40">
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-zinc-900/60 border border-brand-lightBorder dark:border-zinc-800/60 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-800 text-brand-red font-bold text-xs">
            {(profile?.nome_completo || profile?.nome || 'AD').substring(0, 2).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{profile?.nome_completo || profile?.nome || 'Administrador'}</p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">{profile?.email || 'admin@msplay.com'}</p>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={() => signOut()}
              className="rounded-lg p-1.5 text-slate-400 dark:text-zinc-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition"
              title="Sair do sistema"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 rounded-2xl border border-brand-lightBorder dark:border-brand-darkBorder overflow-hidden ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="min-h-[calc(100vh-140px)]">{sidebarContent}</div>
      </aside>

      {externalIsMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={externalOnCloseMobile}
          ></div>
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
