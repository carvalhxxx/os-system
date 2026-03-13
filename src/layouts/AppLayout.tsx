import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Users, Wrench, ClipboardList,
  LogOut, Moon, Sun, Menu, X, ChevronDown,
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
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    toast.success('Você saiu do sistema')
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden">
      <OfflineBanner />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800
        flex flex-col transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-200 dark:border-slate-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[140px]">
              {settings?.name || 'OS Manager'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">Ordens de Serviço</p>
          </div>
          <button
            className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Settings link */}
        <div className="px-3 pb-2 border-t border-gray-100 dark:border-slate-800 pt-2">
          <NavLink
            to="/configuracoes"
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
            }
          >
            <Settings className="w-4 h-4" />
            Configurações
          </NavLink>
        </div>

        {/* User section */}
        <div className="p-3 border-t border-gray-200 dark:border-slate-800">
          <div className="sidebar-item sidebar-item-inactive">
            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {user?.email?.[0].toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="sidebar-item sidebar-item-inactive w-full mt-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center gap-4 px-4 shrink-0">
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          </button>

          <GlobalSearch />

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 transition-colors"
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <NotificationBell />

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">
                    {user?.email?.[0].toUpperCase() || 'U'}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-10 z-20 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg py-1">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700">
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </div>
                </>
              )}
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
