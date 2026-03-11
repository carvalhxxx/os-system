import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, ClipboardList, Eye, Edit2, Trash2, Download, Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ordersService } from '../../services/orders.service'
import { clientsService } from '../../services/clients.service'
import { orderItemsService } from '../../services/orderItems.service'
import { OrderFilters, OrderStatus, ServiceOrder } from '../../types'
import { StatusBadge, EmptyState, PageLoader, ConfirmDialog, Pagination } from '../../components/ui'
import { formatCurrency, formatDate } from '../../lib/utils'
import { exportOrderToPDF } from '../../lib/pdf'
import toast from 'react-hot-toast'

const STATUS_OPTIONS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'aberta', label: 'Abertas' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'aguardando_peca', label: 'Aguardando peça' },
  { value: 'finalizada', label: 'Finalizadas' },
  { value: 'cancelada', label: 'Canceladas' },
]

const PER_PAGE = 12

export default function OrdersPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [filters, setFilters] = useState<OrderFilters>({})
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<ServiceOrder | null>(null)
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null)

  const activeFilters = { ...filters, search: search || undefined }

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.id, activeFilters],
    queryFn: () => ordersService.getAll(user!.id, activeFilters),
    enabled: !!user,
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: () => clientsService.getAll(user!.id),
    enabled: !!user,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ordersService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Ordem excluída!')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Erro ao excluir ordem'),
  })

  const handleExportPDF = async (order: ServiceOrder) => {
    setPdfLoadingId(order.id)
    try {
      const items = await orderItemsService.getByOrderId(order.id)
      const fullOrder = await ordersService.getById(order.id)
      exportOrderToPDF(fullOrder, items)
    } catch {
      toast.error('Erro ao gerar PDF')
    } finally {
      setPdfLoadingId(null)
    }
  }

  const handleFilterChange = (key: keyof OrderFilters, value: string) => {
    setFilters(f => ({ ...f, [key]: value || undefined }))
    setPage(1)
  }

  // Pagination
  const total = orders.length
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const paginated = orders.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ordens de Serviço</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {total} ordem{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/ordens/nova" className="btn-primary">
          <Plus className="w-4 h-4" /> Nova OS
        </Link>
      </div>

      {/* Filters bar */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nº, descrição..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="input-field pl-9"
          />
        </div>

        <select
          value={filters.status || ''}
          onChange={e => handleFilterChange('status', e.target.value)}
          className="input-field w-auto"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={filters.client_id || ''}
          onChange={e => handleFilterChange('client_id', e.target.value)}
          className="input-field w-auto"
        >
          <option value="">Todos os clientes</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={filters.date_from || ''}
            onChange={e => handleFilterChange('date_from', e.target.value)}
            className="input-field w-auto text-sm"
          />
          <span className="text-gray-400 text-sm">até</span>
          <input
            type="date"
            value={filters.date_to || ''}
            onChange={e => handleFilterChange('date_to', e.target.value)}
            className="input-field w-auto text-sm"
          />
        </div>

        {(filters.status || filters.client_id || filters.date_from || filters.date_to || search) && (
          <button
            className="btn-secondary text-sm"
            onClick={() => { setFilters({}); setSearch(''); setPage(1) }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : !orders.length ? (
          <EmptyState
            icon={<ClipboardList className="w-8 h-8" />}
            title="Nenhuma ordem encontrada"
            description="Crie uma nova ordem de serviço ou ajuste os filtros."
            action={
              <Link to="/ordens/nova" className="btn-primary">
                <Plus className="w-4 h-4" /> Nova OS
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800">
                    <th className="table-header">Nº OS</th>
                    <th className="table-header">Cliente</th>
                    <th className="table-header hidden sm:table-cell">Técnico</th>
                    <th className="table-header">Status</th>
                    <th className="table-header hidden md:table-cell">Abertura</th>
                    <th className="table-header hidden lg:table-cell text-right">Valor</th>
                    <th className="table-header text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {paginated.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="table-cell">
                        <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {order.order_number}
                        </span>
                      </td>
                      <td className="table-cell font-medium">{order.client?.name || '—'}</td>
                      <td className="table-cell hidden sm:table-cell text-gray-500 dark:text-slate-400">
                        {order.technician?.name || '—'}
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="table-cell hidden md:table-cell text-gray-500 dark:text-slate-400">
                        {formatDate(order.opened_at)}
                      </td>
                      <td className="table-cell hidden lg:table-cell text-right font-medium">
                        {formatCurrency(order.service_value)}
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/ordens/${order.id}`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {order.status !== 'finalizada' && order.status !== 'cancelada' && (
                            <Link
                              to={`/ordens/${order.id}/editar`}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                          )}
                          <button
                            onClick={() => handleExportPDF(order)}
                            disabled={pdfLoadingId === order.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                            title="Exportar PDF"
                          >
                            {pdfLoadingId === order.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Download className="w-4 h-4" />
                            }
                          </button>
                          {order.status !== 'finalizada' && order.status !== 'cancelada' && (
                            <button
                              onClick={() => setDeleteTarget(order)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > PER_PAGE && (
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                perPage={PER_PAGE}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Excluir Ordem"
        message={`Excluir a ordem "${deleteTarget?.order_number}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
