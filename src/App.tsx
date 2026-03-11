import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'

import { AuthProvider } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import { ProtectedRoute } from './components/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import { persistCache, restoreCache } from './lib/offline'

// Auth pages
import LoginPage from './pages/auth/LoginPage'
import { RegisterPage, RecoverPasswordPage } from './pages/auth/RegisterPage'

// App pages
import DashboardPage from './pages/dashboard/DashboardPage'
import ClientsPage from './pages/clients/ClientsPage'
import TechniciansPage from './pages/technicians/TechniciansPage'
import OrdersPage from './pages/orders/OrdersPage'
import OrderFormPage from './pages/orders/OrderFormPage'
import OrderDetailPage from './pages/orders/OrderDetailPage'
import PartsPage from './pages/parts/PartsPage'
import ReportsPage from './pages/reports/ReportsPage'
import ReceivablesPage from './pages/receivables/ReceivablesPage'
import ClientDetailPage from './pages/clients/ClientDetailPage'
import PortalPage from './pages/portal/PortalPage'
import SettingsPage from './pages/settings/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutos
      retry: 1,
      // Mantém dados do cache mesmo quando a query falha (modo offline)
      gcTime: 1000 * 60 * 60 * 24, // 24 horas em memória
    },
  },
})

// Restaura cache do localStorage ao iniciar
restoreCache(queryClient)

// Persiste cache sempre que uma query é atualizada com sucesso
queryClient.getQueryCache().subscribe(event => {
  if (event.type === 'updated' && event.query.state.status === 'success') {
    persistCache(queryClient)
  }
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />
              <Route path="/recuperar-senha" element={<RecoverPasswordPage />} />
              <Route path="/acompanhar/:token" element={<PortalPage />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/clientes" element={<ClientsPage />} />
                  <Route path="/clientes/:id" element={<ClientDetailPage />} />
                  <Route path="/tecnicos" element={<TechniciansPage />} />
                  <Route path="/pecas" element={<PartsPage />} />
                  <Route path="/relatorios" element={<ReportsPage />} />
                  <Route path="/recebimentos" element={<ReceivablesPage />} />
                  <Route path="/ordens" element={<OrdersPage />} />
                  <Route path="/ordens/nova" element={<OrderFormPage />} />
                  <Route path="/ordens/:id" element={<OrderDetailPage />} />
                  <Route path="/ordens/:id/editar" element={<OrderFormPage />} />
                  <Route path="/configuracoes" element={<SettingsPage />} />
                </Route>
              </Route>

              {/* Redirects */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--toast-bg, #fff)',
                color: 'var(--toast-color, #111)',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
      {import.meta.env.DEV && <ReactQueryDevtools />}
    </QueryClientProvider>
  )
}
