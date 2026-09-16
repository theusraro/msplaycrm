import React from 'react';
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

export type AdminViewType =
  | 'dashboard'
  | 'candidatos'
  | 'resellers'
  | 'leads'
  | 'sales'
  | 'creatives'
  | 'ai_config'
  | 'settings'
  | 'audit';

interface AdminSidebarProps {
  currentView: AdminViewType;
  onSelectView: (view: AdminViewType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentView,
  onSelectView,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { profile, signOut } = useAuth();

  const navSections = [
    {
      title: 'VISÃO GERAL',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'OPERAÇÃO',
      items: [
        { id: 'candidatos', label: 'Candidatos', icon: UserPlus, badge: 'Em Breve' },
        { id: 'resellers', label: 'Revendedores', icon: Users },
        { id: 'leads', label: 'Leads', icon: Inbox },
        { id: 'sales', label: 'Vendas', icon: ShoppingBag },
      ],
    },
    {
      title: 'CONTEÚDO',
      items: [
        { id: 'creatives', label: 'Criativos', icon: ImageIcon },
      ],
    },
    {
      title: 'SISTEMA',
      items: [
        { id: 'ai_config', label: 'Inteligência Artificial', icon: Bot },
        { id: 'settings', label: 'Configurações', icon: Settings },
        { id: 'audit', label: 'Auditoria', icon: ShieldCheck },
      ],
    },
  ];

  const handleSelect = (viewId: string) => {
    onSelectView(viewId as AdminViewType);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#0e0e0e] border-r border-zinc-800/90 select-none">
      {/* Top: Logo & Collapse Button */}
      <div>
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-red text-white shadow-lg shadow-brand-red/20">
              <Flame className="h-5 w-5 fill-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-base font-black tracking-wider text-brand-red">
                  MSPLAY
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  ADMIN CRM
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
            title={isCollapsed ? 'Expandir' : 'Recolher'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Mobile close toggle */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-160px)]">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {section.title}
                </span>
              )}
              <div className="space-y-1 pt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-150 relative ${
                        isActive
                          ? 'bg-brand-red text-white shadow-md shadow-brand-red/20'
                          : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-100 hover:bg-zinc-900'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-brand-red'}`} />
                      {!isCollapsed && (
                        <div className="flex flex-1 items-center justify-between overflow-hidden">
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400">
                              {item.badge}
                            </span>
                          )}
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

      {/* Bottom: Admin User Info & Logout */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/40">
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-brand-red font-bold text-xs">
            {profile?.nome ? profile.nome.substring(0, 2).toUpperCase() : 'AD'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{profile?.nome || 'Administrador'}</p>
              <p className="text-[10px] text-zinc-500 truncate">{profile?.email || 'admin@msplay.com'}</p>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={() => signOut()}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-950/40 hover:text-rose-400 transition"
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
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          ></div>
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
