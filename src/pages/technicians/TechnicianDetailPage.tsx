import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, Edit2, Wrench, Phone, CheckCircle, XCircle,
  ClipboardList, DollarSign, TrendingUp, CheckCircle2,
  FileText, CalendarDays, Timer,
} from 'lucide-react'
import { technicianHistoryService } from '../../services/technicianHistory.service'
import { techniciansService } from '../../services/technicians.service'
import { PageLoader, Modal, FormField, ConfirmDialog } from '../../components/ui'
import {
  formatCurrency, formatDate,
  STATUS_LABELS, STATUS_COLORS,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
} from '../../lib/utils'
import { ServiceOrder, TechnicianInsert, PaymentMethod, PAYMENT_METHOD_LABELS } from '../../types'
import toast from 'react-hot-toast'

const schema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  phone:     z.string().min(10, 'Telefone inválido'),
  specialty: z.string().optional(),
  active:    z.boolean(),
})
type FormData = z.infer<typeof schema>

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub?: string
  icon: React.ReactNode; color: string
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{value}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function OrderRow({ order }: { order: ServiceOrder }) {
  const remaining = (order.service_value || 0) - (order.amount_paid || 0)

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
      <td className="table-cell">
        <Link
          to={`/ordens/${order.id}`}
          className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          {order.order_number}
        </Link>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 max-w-xs truncate">
          {(order.client as any)?.name || '—'}
        </p>
      </td>

      <td className="table-cell hidden sm:table-cell text-sm text-gray-600 dark:text-slate-400">
        {formatDate(order.opened_at)}
      </td>

      <td className="table-cell hidden md:table-cell text-sm text-gray-500 dark:text-slate-400">
        {order.closed_at ? (
          <span className="text-xs">
            {Math.ceil((new Date(order.closed_at).getTime() - new Date(order.opened_at).getTime()) / (1000 * 60 * 60 * 24))}d
          </span>
        ) : <span className="text-gray-300 dark:text-slate-600">—</span>}
      </td>

      <td className="table-cell">
        <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </td>

      <td className="table-cell text-right">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatCurrency(order.service_value)}
        </p>
        {order.status === 'finalizada' && order.payment_status !== 'pago' && remaining > 0 && (
          <p className="text-xs text-red-500 dark:text-red-400">{formatCurrency(remaining)} pend.</p>
        )}
      </td>

      <td className="table-cell hidden lg:table-cell">
        {order.status === 'finalizada' ? (
          <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${PAYMENT_STATUS_COLORS[order.payment_status]}`}>
            {PAYMENT_STATUS_LABELS[order.payment_status]}
            {order.payment_method && (
              <span className="font-normal opacity-75 ml-1">
                · {PAYMENT_METHOD_LABELS[order.payment_method as PaymentMethod]}
              </span>
            )}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-slate-600 text-xs">—</span>
        )}
      </td>

      <td className="table-cell text-right">
        <Link
          to={`/ordens/${order.id}`}
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors inline-flex"
        >
          <FileText className="w-4 h-4" />
        </Link>
      </td>
    </tr>
  )
}

export default function TechnicianDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['technician-history', id],
    queryFn: () => technicianHistoryService.getTechnicianHistory(id!),
    enabled: !!id,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { active: true },
  })

  const updateMutation = useMutation({
    mutationFn: (formData: TechnicianInsert) => techniciansService.update(id!, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['technician-history', id] })
      qc.invalidateQueries({ queryKey: ['technicians'] })
      toast.success('Funcionário atualizado!')
      setEditOpen(false)
    },
    onError: () => toast.error('Erro ao atualizar funcionário'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => techniciansService.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['technicians'] })
      toast.success('Funcionário excluído!')
      navigate('/tecnicos')
    },
    onError: () => toast.error('Erro ao excluir funcionário'),
  })

  const openEdit = () => {
    if (data) reset({
      name:      data.technician.name,
      phone:     data.technician.phone,
      specialty: data.technician.specialty ?? '',
      active:    data.technician.active,
    })
    setEditOpen(true)
  }

  if (isLoading) return <PageLoader />
  if (!data) return null

  const { technician, orders, stats } = data

  const filteredOrders = statusFilter
    ? orders.filter(o => o.status === statusFilter)
    : orders

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const finishedRate = stats.total_orders > 0
    ? Math.round((stats.finished_orders / stats.total_orders) * 100)
    : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/tecnicos')}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{technician.name}</h1>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                technician.active
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {technician.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              {technician.specialty || 'Funcionário'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={openEdit} className="btn-secondary">
            <Edit2 className="w-4 h-4" /> Editar
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="btn-secondary text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
          >
            Excluir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Coluna esquerda — dados */}
        <div className="space-y-4">
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{technician.name}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  {technician.specialty || 'Sem especialidade'}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{technician.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                {technician.active
                  ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  : <XCircle className="w-4 h-4 text-gray-400 shrink-0" />
                }
                <span>{technician.active ? 'Ativo' : 'Inativo'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
                <span>Desde {formatDate(technician.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Resumo de desempenho */}
          <div className="card p-5 space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
              Desempenho
            </p>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-slate-400">Taxa de conclusão</span>
              <span className="font-bold text-gray-800 dark:text-slate-200">{finishedRate}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all"
                style={{ width: `${finishedRate}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-sm pt-1">
              <span className="text-gray-500 dark:text-slate-400">Tempo médio</span>
              <span className="font-semibold text-gray-800 dark:text-slate-200">
                {stats.avg_completion_days > 0
                  ? `${stats.avg_completion_days.toFixed(1)} dias`
                  : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm border-t border-gray-100 dark:border-slate-800 pt-2">
              <span className="text-gray-500 dark:text-slate-400">Primeiro atendimento</span>
              <span className="font-medium text-gray-700 dark:text-slate-300 text-xs">
                {formatDate(stats.first_order)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-slate-400">Último atendimento</span>
              <span className="font-medium text-gray-700 dark:text-slate-300 text-xs">
                {formatDate(stats.last_order)}
              </span>
            </div>
          </div>
        </div>

        {/* Coluna direita — KPIs + histórico */}
        <div className="lg:col-span-2 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Total de OS"
              value={String(stats.total_orders)}
              icon={<ClipboardList className="w-5 h-5" />}
              color="text-blue-600 bg-blue-100 dark:bg-blue-900/40"
            />
            <StatCard
              label="Finalizadas"
              value={String(stats.finished_orders)}
              icon={<CheckCircle2 className="w-5 h-5" />}
              color="text-green-600 bg-green-100 dark:bg-green-900/40"
            />
            <StatCard
              label="Receita Gerada"
              value={formatCurrency(stats.total_revenue)}
              icon={<DollarSign className="w-5 h-5" />}
              color="text-purple-600 bg-purple-100 dark:bg-purple-900/40"
            />
            <StatCard
              label="Ticket Médio"
              value={formatCurrency(stats.avg_ticket)}
              icon={<TrendingUp className="w-5 h-5" />}
              color="text-amber-600 bg-amber-100 dark:bg-amber-900/40"
            />
          </div>

          {/* Histórico de OS */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                Ordens de Serviço
                <span className="ml-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {orders.length}
                </span>
              </h2>

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setStatusFilter('')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                    !statusFilter
                      ? 'bg-gray-800 dark:bg-slate-200 text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Todos
                </button>
                {Object.entries(statusCounts).map(([status, count]) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status === statusFilter ? '' : status)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                      statusFilter === status
                        ? STATUS_COLORS[status as keyof typeof STATUS_COLORS]
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {STATUS_LABELS[status as keyof typeof STATUS_LABELS]} ({count})
                  </button>
                ))}
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center">
                <ClipboardList className="w-8 h-8 text-gray-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-slate-500">
                  {statusFilter ? 'Nenhuma OS com este status' : 'Nenhuma OS atribuída a este funcionário'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800">
                      <th className="table-header">OS / Cliente</th>
                      <th className="table-header hidden sm:table-cell">Abertura</th>
                      <th className="table-header hidden md:table-cell">
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" /> Prazo
                        </span>
                      </th>
                      <th className="table-header">Status</th>
                      <th className="table-header text-right">Valor</th>
                      <th className="table-header hidden lg:table-cell">Pagamento</th>
                      <th className="table-header text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {filteredOrders.map(order => (
                      <OrderRow key={order.id} order={order} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal edição */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar Funcionário">
        <form onSubmit={handleSubmit(d => updateMutation.mutate({
          name: d.name, phone: d.phone,
          specialty: d.specialty || null, active: d.active,
        }))} className="space-y-4">
          <FormField label="Nome" error={errors.name?.message} required>
            <input {...register('name')} className="input-field" />
          </FormField>
          <FormField label="Telefone" error={errors.phone?.message} required>
            <input {...register('phone')} className="input-field" />
          </FormField>
          <FormField label="Especialidade" error={errors.specialty?.message}>
            <input {...register('specialty')} className="input-field" placeholder="Ex: Informática, Elétrica..." />
          </FormField>
          <FormField label="Status">
            <label className="flex items-center gap-3 cursor-pointer">
              <input {...register('active')} type="checkbox" className="w-4 h-4 rounded text-blue-600" />
              <span className="text-sm text-gray-700 dark:text-slate-300">Funcionário ativo</span>
            </label>
          </FormField>
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-slate-700">
            <button type="button" className="btn-secondary" onClick={() => setEditOpen(false)}>Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmar exclusão */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Excluir Funcionário"
        message={`Excluir "${technician.name}"? As ordens de serviço vinculadas não serão removidas.`}
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}