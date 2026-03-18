import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Users, Wrench, ClipboardList,
  LogOut, Moon, Sun, Menu, X, ChevronRight,
  Package, BarChart2, Wallet, Settings, Receipt,
} from 'lucide-react'
import { useAuth } from '.././hooks/useAuth'
import { useTheme } from '.././hooks/useTheme'
import { useCompanySettings } from '.././hooks/useCompanySettings'
import { GlobalSearch } from '../components/GlobalSearch'
import { NotificationBell } from '../components/NotificationBell'
import { OfflineBanner } from '../components/OfflineBanner'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes',     icon: Users,           label: 'Clientes' },
  { to: '/tecnicos',     icon: Wrench,          label: 'Funcionários' },
  { to: '/pecas',        icon: Package,         label: 'Catálogo de Peças' },
  { to: '/ordens',       icon: ClipboardList,   label: 'Ordens de Serviço' },
  { to: '/orcamentos',   icon: Receipt,         label: 'Orçamentos' },
  { to: '/recebimentos', icon: Wallet,          label: 'Recebimentos' },
  { to: '/relatorios',   icon: BarChart2,       label: 'Relatórios' },
]

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { settings } = useCompanySettings()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    toast.success('Você saiu do sistema')
    navigate('/login')
  }

  const companyName = settings?.name || 'OS Manager'
  const userInitial = user?.email?.[0].toUpperCase() || 'U'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-900">
      <OfflineBanner />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 flex flex-col
        bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800
        transition-[width,transform] duration-300 ease-in-out will-change-[width] overflow-hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
        ${collapsed ? 'lg:w-14' : 'w-56 lg:w-56'}
      `}>

        {/* Logo */}
        <div className={`flex items-center h-14 border-b border-gray-200 dark:border-slate-800 shrink-0 ${collapsed ? 'justify-center px-2' : 'px-4 gap-3'}`}>
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt={companyName} className="w-7 h-7 object-contain rounded shrink-0" />
          ) : (
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center shrink-0">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
          )}
          {!collapsed && (
            <span className={`font-bold text-sm text-gray-900 dark:text-white truncate flex-1 transition-[opacity,max-width] duration-200 ease-in-out overflow-hidden whitespace-nowrap ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-full'}`}>{companyName}</span>
          )}
          <button className="lg:hidden p-1 ml-auto text-gray-400 hover:text-gray-600" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => { setSidebarOpen(false); setCollapsed(true) }}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center text-sm transition-colors
                ${collapsed ? 'justify-center px-2 py-3' : 'px-4 py-2.5 gap-3'}
                ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className={`truncate flex-1 transition-[opacity,max-width] duration-200 ease-in-out overflow-hidden whitespace-nowrap ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-full'}`}>{label}</span>
              <ChevronRight className={`w-3 h-3 text-gray-300 dark:text-slate-600 shrink-0 transition-[opacity] duration-200 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`} />
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-gray-200 dark:border-slate-800 py-2">
          <NavLink
            to="/configuracoes"
            onClick={() => { setSidebarOpen(false); setCollapsed(true) }}
            title={collapsed ? 'Configurações' : undefined}
            className={({ isActive }) =>
              `flex items-center text-sm transition-colors
              ${collapsed ? 'justify-center px-2 py-3' : 'px-4 py-2.5 gap-3'}
              ${isActive
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600'
                : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className={`flex-1 transition-[opacity,max-width] duration-200 ease-in-out overflow-hidden whitespace-nowrap ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-full'}`}>Configurações</span>
            <ChevronRight className={`w-3 h-3 text-gray-300 dark:text-slate-600 shrink-0 transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`} />
          </NavLink>

          <button
            onClick={handleSignOut}
            title={collapsed ? 'Sair' : undefined}
            className={`flex items-center text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-red-600 dark:hover:text-red-400 transition-colors w-full
              ${collapsed ? 'justify-center px-2 py-3' : 'px-4 py-2.5 gap-3'}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className={`flex-1 text-left transition-[opacity,max-width] duration-200 ease-in-out overflow-hidden whitespace-nowrap ${collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-full'}`}>Sair</span>
          </button>

        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center gap-3 px-4 shrink-0">
          <button className="lg:hidden p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="hidden lg:flex p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors shrink-0"
          >
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
          </button>

          <GlobalSearch />

          <div className="ml-auto flex items-center gap-1">
            {/* Company name */}
            <span className="hidden md:block text-sm font-semibold text-gray-700 dark:text-slate-300 mr-2">
              {companyName}
            </span>

            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1" />

            <button
              onClick={toggleTheme}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors"
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <NotificationBell />

            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1" />

            {/* User */}
            <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-default">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-white">{userInitial}</span>
              </div>
              <span className="hidden md:block text-sm text-gray-600 dark:text-slate-400 truncate max-w-[120px]">
                {user?.email?.split('@')[0]}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}