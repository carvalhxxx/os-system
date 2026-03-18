import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Edit2, Phone, Mail, MapPin, FileText,
  ClipboardList, TrendingUp,
  CheckCircle2, XCircle, Plus, User,
} from 'lucide-react'
import { clientHistoryService } from '../../services/clientHistory.service'
import { clientsService } from '../../services/clients.service'
import {
   PageLoader, Modal, FormField, ConfirmDialog,
} from '../../components/ui'
import {
  formatCurrency, formatDate,
  STATUS_LABELS, STATUS_COLORS,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
} from '../../lib/utils'
import { ClientInsert, ServiceOrder } from '../../types'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'

// ─── Reutilizamos o schema de edição do cliente ───────────
const schema = z.object({
  name:     z.string().min(2, 'Nome obrigatório'),
  phone:    z.string().min(10, 'Telefone inválido'),
  email:    z.string().email('Email inválido').or(z.literal('')).optional(),
  document: z.string().min(11, 'CPF/CNPJ inválido'),
  address:  z.string().optional(),
  city:     z.string().optional(),
  state:    z.string().optional(),
  zip_code: z.string().optional(),
  notes:    z.string().optional(),
})
type FormData = z.infer<typeof schema>

// ─── Stat card ─────────────────────────────────────────────
function StatCard({
  label, value, sub, icon, color,
}: {
  label: string; value: string; sub?: string
  icon: React.ReactNode; color: string
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Linha da OS no histórico ──────────────────────────────
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
          {order.problem_description}
        </p>
      </td>

      <td className="table-cell hidden sm:table-cell text-sm text-gray-600 dark:text-slate-400">
        {formatDate(order.opened_at)}
      </td>

      <td className="table-cell hidden md:table-cell text-sm text-gray-600 dark:text-slate-400">
        {(order.technician as any)?.name || <span className="text-gray-300 dark:text-slate-600">—</span>}
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
          <p className="text-xs text-red-500 dark:text-red-400">
            {formatCurrency(remaining)} pendente
          </p>
        )}
      </td>

      <td className="table-cell hidden lg:table-cell">
        {order.status === 'finalizada' ? (
          <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${PAYMENT_STATUS_COLORS[order.payment_status]}`}>
            {PAYMENT_STATUS_LABELS[order.payment_status]}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-slate-600 text-xs">—</span>
        )}
      </td>

      <td className="table-cell text-right">
        <Link
          to={`/ordens/${order.id}`}
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors inline-flex"
          title="Abrir OS"
        >
          <FileText className="w-4 h-4" />
        </Link>
      </td>
    </tr>
  )
}

// ─── Página principal ──────────────────────────────────────
export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['client-history', id],
    queryFn: () => clientHistoryService.getClientHistory(id!),
    enabled: !!id,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const updateMutation = useMutation({
    mutationFn: (formData: ClientInsert) => clientsService.update(id!, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-history', id] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente atualizado!')
      setEditOpen(false)
    },
    onError: () => toast.error('Erro ao atualizar cliente'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => clientsService.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente excluído!')
      navigate('/clientes')
    },
    onError: () => toast.error('Erro ao excluir cliente'),
  })

  const openEdit = () => {
    if (data) reset({
      name:     data.client.name,
      phone:    data.client.phone,
      email:    data.client.email    ?? '',
      document: data.client.document,
      address:  data.client.address  ?? '',
      city:     data.client.city     ?? '',
      state:    data.client.state    ?? '',
      zip_code: data.client.zip_code ?? '',
      notes:    data.client.notes    ?? '',
    })
    setEditOpen(true)
  }

  const onSubmit = (formData: FormData) => {
    updateMutation.mutate({
      name:     formData.name,
      phone:    formData.phone,
      email:    formData.email || null,
      document: formData.document,
      address:  formData.address || null,
      city:     formData.city || null,
      state:    formData.state || null,
      zip_code: formData.zip_code || null,
      notes:    formData.notes || null,
    })
  }

  if (isLoading) return <PageLoader />
  if (!data) return null

  const { client, orders, stats } = data

  const filteredOrders = statusFilter
    ? orders.filter(o => o.status === statusFilter)
    : orders

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/clientes')}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{client.name}</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              Cliente desde {formatDate(client.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/ordens/nova?client_id=${client.id}`}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> Nova OS
          </Link>
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

      {/* ── Layout 2 colunas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Coluna esquerda: dados do cliente ── */}
        <div className="space-y-4">
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{client.name}</p>
                <p className="text-xs font-mono text-gray-400 dark:text-slate-500">{client.document}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{client.phone}</span>
              </div>
              {client.email && (
                <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
              )}
              {(client.address || client.city) && (
                <div className="flex items-start gap-2 text-gray-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span>
                    {[client.address, client.city, client.state].filter(Boolean).join(', ')}
                    {client.zip_code && ` — ${client.zip_code}`}
                  </span>
                </div>
              )}
            </div>

            {client.notes && (
              <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
                <p className="text-xs font-medium text-gray-400 dark:text-slate-500 mb-1">Observações</p>
                <p className="text-sm text-gray-600 dark:text-slate-400 italic">"{client.notes}"</p>
              </div>
            )}
          </div>

          {/* Datas */}
          <div className="card p-5 space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
              Histórico
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-slate-400">Primeiro atendimento</span>
              <span className="font-medium text-gray-800 dark:text-slate-200">
                {formatDate(stats.first_order)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-slate-400">Último atendimento</span>
              <span className="font-medium text-gray-800 dark:text-slate-200">
                {formatDate(stats.last_order)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Total gasto</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(stats.total_spent)}
              </span>
            </div>
            {stats.total_pending > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-slate-400">A receber</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(stats.total_pending)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Coluna direita: KPIs + histórico ── */}
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
              label="Ticket Médio"
              value={formatCurrency(stats.avg_ticket)}
              icon={<TrendingUp className="w-5 h-5" />}
              color="text-purple-600 bg-purple-100 dark:bg-purple-900/40"
            />
            <StatCard
              label="Canceladas"
              value={String(stats.cancelled_orders)}
              icon={<XCircle className="w-5 h-5" />}
              color="text-red-500 bg-red-100 dark:bg-red-900/40"
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

              {/* Filtro por status */}
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
                  {statusFilter ? 'Nenhuma OS com este status' : 'Nenhuma ordem de serviço encontrada'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800">
                      <th className="table-header">OS / Problema</th>
                      <th className="table-header hidden sm:table-cell">Abertura</th>
                      <th className="table-header hidden md:table-cell">Funcionário</th>
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

      {/* ── Modal de edição ── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar Cliente" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nome" error={errors.name?.message} required>
              <input {...register('name')} className="input-field" />
            </FormField>
            <FormField label="Telefone" error={errors.phone?.message} required>
              <input {...register('phone')} className="input-field" />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="CPF / CNPJ" error={errors.document?.message} required>
              <input {...register('document')} className="input-field" />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" className="input-field" />
            </FormField>
          </div>
          <FormField label="Endereço" error={errors.address?.message}>
            <input {...register('address')} className="input-field" />
          </FormField>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <FormField label="Cidade" error={errors.city?.message}>
                <input {...register('city')} className="input-field" />
              </FormField>
            </div>
            <FormField label="Estado" error={errors.state?.message}>
              <input {...register('state')} className="input-field" maxLength={2} />
            </FormField>
            <FormField label="CEP" error={errors.zip_code?.message}>
              <input {...register('zip_code')} className="input-field" />
            </FormField>
          </div>
          <FormField label="Observações" error={errors.notes?.message}>
            <textarea {...register('notes')} rows={2} className="input-field resize-none" />
          </FormField>
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-slate-700">
            <button type="button" className="btn-secondary" onClick={() => setEditOpen(false)}>Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Confirmar exclusão ── */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Excluir Cliente"
        message={`Excluir "${client.name}"? Todas as ordens de serviço vinculadas também serão removidas.`}
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}