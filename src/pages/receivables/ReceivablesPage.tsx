import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  DollarSign, Clock, AlertTriangle, CheckCircle2, Eye, TrendingUp, Filter,
  Banknote, Zap, CreditCard, SmartphoneNfc, ArrowLeftRight, FileText, MoreHorizontal,
  CalendarDays,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { paymentsService } from '../../services/payments.service'
import {
  PaymentStatus, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_LABELS, PaymentMethod,
} from '../../types'
import { formatCurrency, formatDate } from '../../lib/utils'
import { PageLoader, EmptyState } from '../../components/ui'

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  dinheiro:       <Banknote className="w-3.5 h-3.5" />,
  pix:            <Zap className="w-3.5 h-3.5" />,
  cartao_credito: <CreditCard className="w-3.5 h-3.5" />,
  cartao_debito:  <SmartphoneNfc className="w-3.5 h-3.5" />,
  transferencia:  <ArrowLeftRight className="w-3.5 h-3.5" />,
  boleto:         <FileText className="w-3.5 h-3.5" />,
  outro:          <MoreHorizontal className="w-3.5 h-3.5" />,
}

const FILTER_OPTIONS: { value: PaymentStatus | ''; label: string; icon: React.ReactNode }[] = [
  { value: '',          label: 'Todos',    icon: <Filter className="w-3.5 h-3.5" /> },
  { value: 'pendente',  label: 'Pendente', icon: <Clock className="w-3.5 h-3.5" /> },
  { value: 'pago_parcial', label: 'Parcial', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { value: 'pago',      label: 'Pago',     icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
]

export default function ReceivablesPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<PaymentStatus | ''>('')

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['receivable-stats', user?.id],
    queryFn: () => paymentsService.getStats(user!.id),
    enabled: !!user,
    staleTime: 0,
  })

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['receivables', user?.id, filter],
    queryFn: () => paymentsService.getReceivables(user!.id, filter || undefined),
    enabled: !!user,
    staleTime: 0,
  })

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const isOverdue = (order: typeof orders[0]) =>
    order.payment_status !== 'pago' &&
    order.closed_at &&
    new Date(order.closed_at) < sevenDaysAgo

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contas a Receber</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Acompanhe os pagamentos das ordens de serviço finalizadas
        </p>
      </div>

      {/* KPIs */}
      {loadingStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 h-24 animate-pulse bg-gray-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">A receber</span>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(stats.total_receivable)}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              {stats.count_pending} pendente{stats.count_pending !== 1 ? 's' : ''} · {stats.count_partial} parcial
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Recebido</span>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(stats.total_paid)}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              {stats.count_paid} OS paga{stats.count_paid !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Em atraso</span>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(stats.total_overdue)}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              Finalizado há +7 dias
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Taxa de recebimento</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.total_paid + stats.total_receivable > 0
                ? Math.round((stats.total_paid / (stats.total_paid + stats.total_receivable)) * 100)
                : 0}%
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              do total faturado
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              filter === opt.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-blue-400'
            }`}
          >
            {opt.icon}
            {opt.label}
            {opt.value && stats && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                filter === opt.value
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
              }`}>
                {opt.value === 'pendente'     && stats.count_pending}
                {opt.value === 'pago_parcial' && stats.count_partial}
                {opt.value === 'pago'         && stats.count_paid}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {loadingOrders ? (
          <PageLoader />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<DollarSign className="w-8 h-8" />}
            title="Nenhuma ordem encontrada"
            description="As ordens de serviço finalizadas aparecerão aqui com o status de pagamento."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800">
                  <th className="table-header">OS / Cliente</th>
                  <th className="table-header hidden sm:table-cell">Finalizada</th>
                  <th className="table-header text-right">Valor</th>
                  <th className="table-header text-right hidden md:table-cell">Recebido</th>
                  <th className="table-header text-right hidden md:table-cell">Restante</th>
                  <th className="table-header">Pagamento</th>
                  <th className="table-header text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {orders.map(order => {
                  const overdue = isOverdue(order)
                  const remaining = order.service_value - (order.amount_paid || 0)

                  return (
                    <tr
                      key={order.id}
                      className={`transition-colors ${
                        overdue
                          ? 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="table-cell">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {order.order_number}
                            </span>
                            {overdue && (
                              <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 px-1.5 py-0.5 rounded font-semibold">
                                Atraso
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                            {(order.client as any)?.name || '—'}
                          </p>
                        </div>
                      </td>

                      <td className="table-cell hidden sm:table-cell text-sm text-gray-600 dark:text-slate-400">
                        {formatDate(order.closed_at)}
                      </td>

                      <td className="table-cell text-right font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(order.service_value)}
                      </td>

                      <td className="table-cell text-right hidden md:table-cell">
                        <span className={order.amount_paid > 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400'}>
                          {formatCurrency(order.amount_paid || 0)}
                        </span>
                      </td>

                      <td className="table-cell text-right hidden md:table-cell">
                        <span className={remaining > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-400'}>
                          {formatCurrency(remaining > 0 ? remaining : 0)}
                        </span>
                      </td>

                      <td className="table-cell">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${PAYMENT_STATUS_COLORS[order.payment_status]}`}>
                            {PAYMENT_STATUS_LABELS[order.payment_status]}
                          </span>
                          {order.payment_method && (
                            <p className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                              {METHOD_ICONS[order.payment_method]}
                              {PAYMENT_METHOD_LABELS[order.payment_method]}
                            </p>
                          )}
                          {order.payment_date && (
                            <p className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {formatDate(order.payment_date)}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="table-cell text-right">
                        <Link
                          to={`/ordens/${order.id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors inline-flex"
                          title="Ver OS"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}