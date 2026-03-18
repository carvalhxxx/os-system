import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, Edit2, Package, Tag, Calendar,
  ClipboardList, DollarSign, TrendingUp, Hash,
} from 'lucide-react'
import { partsService } from '../../services/parts.service'
import { supabase } from '../../lib/supabase'
import { PageLoader, Modal, FormField, ConfirmDialog } from '../../components/ui'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS } from '../../lib/utils'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

const schema = z.object({
  code:       z.string().optional(),
  name:       z.string().min(2, 'Nome obrigatório'),
  unit_price: z.coerce.number().min(0, 'Valor inválido'),
  notes:      z.string().optional(),
})
type FormData = z.infer<typeof schema>

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
        <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  )
}

export default function PartDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: part, isLoading } = useQuery({
    queryKey: ['part', id],
    queryFn: () => partsService.getById(id!),
    enabled: !!id,
  })

  const { data: usages = [] } = useQuery({
    queryKey: ['part-usages', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('order_items')
        .select('*, service_order:service_orders(id, order_number, status, opened_at, client:clients(name))')
        .eq('part_id', id!)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!id,
  })

  const totalUsed     = usages.reduce((s: number, i: any) => s + i.quantity, 0)
  const totalRevenue  = usages.reduce((s: number, i: any) => s + i.total_price, 0)
  const avgPrice      = totalUsed > 0 ? totalRevenue / totalUsed : 0

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => partsService.update(id!, {
      code: data.code || null,
      name: data.name,
      unit_price: data.unit_price,
      notes: data.notes || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['part', id] })
      qc.invalidateQueries({ queryKey: ['parts'] })
      toast.success('Peça atualizada!')
      setEditOpen(false)
    },
    onError: () => toast.error('Erro ao atualizar peça'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => partsService.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parts'] })
      toast.success('Peça excluída!')
      navigate('/pecas')
    },
    onError: () => toast.error('Erro ao excluir peça — pode estar vinculada a uma OS'),
  })

  const openEdit = () => {
    if (!part) return
    reset({ code: part.code ?? '', name: part.name, unit_price: part.unit_price, notes: part.notes ?? '' })
    setEditOpen(true)
  }

  if (isLoading) return <PageLoader />
  if (!part) return <div className="p-8 text-center text-gray-400">Peça não encontrada</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/pecas')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 mt-0.5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{part.name}</h1>
            {part.code && (
              <span className="font-mono text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-1 rounded">
                {part.code}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Cadastrado em {formatDate(part.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={openEdit} className="btn-secondary">
            <Edit2 className="w-4 h-4" /> Editar
          </button>
          <button onClick={() => setDeleteOpen(true)} className="btn-secondary text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
            Excluir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Coluna esquerda — info */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Informações</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 dark:text-slate-500">Valor unitário</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(part.unit_price)}</p>
                </div>
              </div>
              {part.code && (
                <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">Código / Referência</p>
                    <p className="text-sm font-mono font-medium text-gray-700 dark:text-slate-300">{part.code}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 dark:text-slate-500">Cadastrado em</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300">{formatDate(part.created_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {part.notes && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Observações</h3>
              <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">{part.notes}</p>
            </div>
          )}
        </div>

        {/* Coluna direita — stats + histórico */}
        <div className="lg:col-span-2 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Vezes usada" value={String(totalUsed)} icon={<Tag className="w-5 h-5" />} color="text-blue-600 bg-blue-100 dark:bg-blue-900/40" />
            <StatCard label="Receita gerada" value={formatCurrency(totalRevenue)} icon={<TrendingUp className="w-5 h-5" />} color="text-green-600 bg-green-100 dark:bg-green-900/40" />
            <StatCard label="Preço médio aplicado" value={formatCurrency(avgPrice)} icon={<DollarSign className="w-5 h-5" />} color="text-purple-600 bg-purple-100 dark:bg-purple-900/40" />
          </div>

          {/* Histórico de OS */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> Ordens de Serviço
              </h3>
            </div>

            {usages.length === 0 ? (
              <div className="py-10 text-center">
                <Package className="w-8 h-8 text-gray-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-slate-500">Peça ainda não utilizada em nenhuma OS</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800">
                      <th className="table-header">OS</th>
                      <th className="table-header hidden sm:table-cell">Cliente</th>
                      <th className="table-header hidden md:table-cell">Data</th>
                      <th className="table-header">Status</th>
                      <th className="table-header text-right">Qtd / Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {usages.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="table-cell">
                          <Link to={`/ordens/${item.service_order?.id}`} className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                            {item.service_order?.order_number}
                          </Link>
                        </td>
                        <td className="table-cell hidden sm:table-cell text-sm text-gray-600 dark:text-slate-400">
                          {item.service_order?.client?.name || '—'}
                        </td>
                        <td className="table-cell hidden md:table-cell text-sm text-gray-500 dark:text-slate-400">
                          {formatDate(item.service_order?.opened_at)}
                        </td>
                        <td className="table-cell">
                          {item.service_order?.status && (
                            <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[item.service_order.status as keyof typeof STATUS_COLORS]}`}>
                              {STATUS_LABELS[item.service_order.status as keyof typeof STATUS_LABELS]}
                            </span>
                          )}
                        </td>
                        <td className="table-cell text-right">
                          <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">{item.quantity}x</p>
                          <p className="text-xs text-gray-400">{formatCurrency(item.total_price)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal editar */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar Peça">
        <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-4">
          <FormField label="Nome da Peça" error={errors.name?.message} required>
            <input {...register('name')} className="input-field" autoFocus />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Código / Referência" error={errors.code?.message}>
              <input {...register('code')} className="input-field font-mono" />
            </FormField>
            <FormField label="Valor Unitário (R$)" error={errors.unit_price?.message} required>
              <input {...register('unit_price')} type="number" step="0.01" min="0" className="input-field" />
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

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Excluir Peça"
        message={`Excluir "${part.name}"? Ela não poderá ser removida se estiver vinculada a ordens de serviço.`}
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}