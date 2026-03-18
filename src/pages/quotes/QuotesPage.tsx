import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Pencil, Trash2, CheckCircle, XCircle, Clock, FileText } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { quotesService, Quote } from '../../services/quotes.service'
import { formatCurrency, formatDate } from '../../lib/utils'
import { PageLoader, EmptyState, ConfirmDialog, Pagination } from '../../components/ui'
import toast from 'react-hot-toast'

const STATUS_LABEL: Record<Quote['status'], string> = {
  pendente:  'Pendente',
  aprovado:  'Aprovado',
  recusado:  'Recusado',
}
const STATUS_COLOR: Record<Quote['status'], string> = {
  pendente:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  aprovado:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  recusado:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}
const STATUS_ICON: Record<Quote['status'], React.ReactNode> = {
  pendente:  <Clock className="w-3 h-3" />,
  aprovado:  <CheckCircle className="w-3 h-3" />,
  recusado:  <XCircle className="w-3 h-3" />,
}

const PAGE_SIZE = 10

export default function QuotesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<Quote['status'] | 'todos'>('todos')

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes', user?.id],
    queryFn: () => quotesService.list(user!.id),
    enabled: !!user,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quotesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] })
      toast.success('Orçamento removido!')
      setDeleteId(null)
    },
    onError: () => toast.error('Erro ao remover orçamento'),
  })

  const filtered = quotes.filter(q => statusFilter === 'todos' || q.status === statusFilter)
  const total = filtered.length
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orçamentos</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{total} orçamento{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => navigate('/orcamentos/novo')} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Orçamento
        </button>
      </div>

      {/* Filtro de status */}
      <div className="flex gap-2 flex-wrap">
        {(['todos', 'pendente', 'aprovado', 'recusado'] as const).map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-blue-400'
            }`}
          >
            {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {paginated.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="Nenhum orçamento"
          description="Crie o primeiro orçamento para um cliente."
          action={<button onClick={() => navigate('/orcamentos/novo')} className="btn-primary">Novo Orçamento</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  {['Número', 'Cliente', 'Descrição', 'Total', 'Status', 'Data', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {paginated.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {q.quote_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-200 whitespace-nowrap">
                      {q.client?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400 max-w-[200px] truncate">
                      {q.description}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-slate-200 whitespace-nowrap">
                      {formatCurrency(q.total_value)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[q.status]}`}>
                        {STATUS_ICON[q.status]} {STATUS_LABEL[q.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap text-xs">
                      {formatDate(q.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => navigate(`/orcamentos/${q.id}`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Ver orçamento"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {q.status === 'pendente' && (
                          <>
                            <button
                              onClick={() => navigate(`/orcamentos/${q.id}`)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(q.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {total > PAGE_SIZE && (
        <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} total={total} perPage={PAGE_SIZE} onPageChange={setPage} />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Excluir Orçamento"
        message="Tem certeza que deseja excluir este orçamento?"
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}