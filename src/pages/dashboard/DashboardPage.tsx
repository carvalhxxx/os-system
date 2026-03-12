import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  ClipboardList, Clock, CheckCircle, DollarSign,
  ArrowRight, AlertCircle, Wallet, TrendingDown,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ordersService } from '../../services/orders.service'
import { paymentsService } from '../../services/payments.service'
import { StatusBadge, PageLoader } from '../../components/ui'
import {
  formatCurrency, formatDate,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
} from '../../lib/utils'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: () => ordersService.getDashboardStats(user!.id),
    enabled: !!user,
  })

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['recent-orders', user?.id],
    queryFn: () => ordersService.getRecent(user!.id, 8),
    enabled: !!user,
  })

  const { data: overdueOrders = [] } = useQuery({
    queryKey: ['overdue-orders', user?.id],
    queryFn: async () => {
      const all = await paymentsService.getReceivables(user!.id)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return all
        .filter(o =>
          o.payment_status !== 'pago' &&
          o.closed_at &&
          new Date(o.closed_at) < sevenDaysAgo
        )
        .slice(0, 5)
    },
    enabled: !!user,
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Visão geral do seu negócio
        </p>
      </div>

      {/* ── KPIs ── */}
      {statsLoading ? <PageLoader /> : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">

          {/* OS Abertas */}
          <Link to="/ordens?status=aberta" className="card p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400">
                <ClipboardList className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-blue-400 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.total_open ?? 0}</p>
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mt-0.5">OS Abertas</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">aguardando atendimento</p>
          </Link>

          {/* Em Andamento */}
          <Link to="/ordens?status=em_andamento" className="card p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-amber-400 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.total_in_progress ?? 0}</p>
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mt-0.5">Em Andamento</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">sendo atendidas agora</p>
          </Link>

          {/* Finalizadas */}
          <Link to="/ordens?status=finalizada" className="card p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-green-400 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.total_finished ?? 0}</p>
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mt-0.5">Finalizadas</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">ordens concluídas</p>
          </Link>

          {/* Receita Recebida */}
          <Link to="/recebimentos?status=pago" className="card p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-purple-400 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
              {formatCurrency(stats?.total_revenue ?? 0)}
            </p>
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mt-0.5">Receita Recebida</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">pagamentos confirmados</p>
          </Link>

          {/* A Receber */}
          <Link to="/recebimentos?status=pendente" className="card p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-cyan-600 bg-cyan-100 dark:bg-cyan-900/40 dark:text-cyan-400">
                <Wallet className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-cyan-400 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
              {formatCurrency(stats?.total_receivable ?? 0)}
            </p>
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mt-0.5">A Receber</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">pendente de pagamento</p>
          </Link>

          {/* Em Atraso */}
          <Link to="/recebimentos" className="card p-5 hover:shadow-md transition-shadow group border border-transparent hover:border-red-200 dark:hover:border-red-800">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400">
                <TrendingDown className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-red-400 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {overdueOrders.length}
            </p>
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mt-0.5">Em Atraso</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">finalizada há +7 dias sem pagamento</p>
          </Link>
        </div>
      )}

      {/* ── Alertas de atraso ── */}
      {overdueOrders.length > 0 && (
        <div className="card overflow-hidden border border-red-200 dark:border-red-900/50">
          <div className="flex items-center justify-between px-6 py-4 border-b border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">
                Pagamentos em Atraso
              </h2>
              <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {overdueOrders.length}
              </span>
            </div>
            <Link
              to="/recebimentos"
              className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {overdueOrders.map(order => {
              const remaining = (order.service_value || 0) - (order.amount_paid || 0)
              const daysLate = order.closed_at
                ? Math.floor((Date.now() - new Date(order.closed_at).getTime()) / (1000 * 60 * 60 * 24))
                : 0

              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/ordens/${order.id}`)}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {order.order_number}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PAYMENT_STATUS_COLORS[order.payment_status]}`}>
                        {PAYMENT_STATUS_LABELS[order.payment_status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      {(order.client as any)?.name} · finalizada {formatDate(order.closed_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(remaining)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      {daysLate}d em atraso
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Últimas OS ── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Últimas Ordens de Serviço
          </h2>
          <Link to="/ordens" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            Ver todas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {ordersLoading ? <PageLoader /> : !recentOrders?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-10 h-10 text-gray-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-slate-400">Nenhuma ordem cadastrada ainda</p>
            <Link to="/ordens/nova" className="btn-primary mt-4 text-sm">
              Criar primeira OS
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800">
                  <th className="table-header">Nº OS</th>
                  <th className="table-header">Cliente</th>
                  <th className="table-header hidden sm:table-cell">Funcionário</th>
                  <th className="table-header">Status</th>
                  <th className="table-header hidden md:table-cell">Data</th>
                  <th className="table-header text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {recentOrders.map(order => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/ordens/${order.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="table-cell font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {order.order_number}
                    </td>
                    <td className="table-cell font-medium">{order.client?.name || '—'}</td>
                    <td className="table-cell hidden sm:table-cell text-gray-500 dark:text-slate-400">
                      {order.technician?.name || '—'}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="table-cell hidden md:table-cell text-gray-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(order.opened_at)}
                    </td>
                    <td className="table-cell text-right font-medium">
                      {formatCurrency(order.service_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
