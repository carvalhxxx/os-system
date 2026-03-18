import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Edit2, Trash2, Package, Eye } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { partsService } from '../../services/parts.service'
import { Part, PartInsert } from '../../types'
import {
  Modal, ConfirmDialog, EmptyState, PageLoader, FormField, Pagination,
} from '../../components/ui'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const schema = z.object({
  code: z.string().optional(),
  name: z.string().min(2, 'Nome obrigatório'),
  unit_price: z.coerce.number().min(0, 'Valor inválido'),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const PER_PAGE = 12

export default function PartsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Part | null>(null)
  const [editTarget, setEditTarget] = useState<Part | null>(null)

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['parts', user?.id, search],
    queryFn: () => partsService.getAll(user!.id, search || undefined),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: (data: PartInsert) => partsService.create(user!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parts'] })
      toast.success('Peça criada!')
      closeModal()
    },
    onError: () => toast.error('Erro ao criar peça'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PartInsert }) =>
      partsService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parts'] })
      toast.success('Peça atualizada!')
      closeModal()
    },
    onError: () => toast.error('Erro ao atualizar peça'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => partsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parts'] })
      toast.success('Peça excluída!')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Erro ao excluir peça'),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const openCreate = () => { setEditTarget(null); reset({}); setModalOpen(true) }
  const openEdit = (p: Part) => { setEditTarget(p); reset({ ...p, code: p.code ?? '', notes: p.notes ?? '' }); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditTarget(null); reset({}) }

  const onSubmit = (data: FormData) => {
    const payload: PartInsert = {
      code: data.code || null,
      name: data.name,
      unit_price: data.unit_price,
      notes: data.notes || null,
    }
    if (editTarget) updateMutation.mutate({ id: editTarget.id, data: payload })
    else createMutation.mutate(payload)
  }

  const total = parts.length
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const paginated = parts.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Catálogo de Peças</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {total} peça{total !== 1 ? 's' : ''} cadastrada{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Nova Peça
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome ou código..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="input-field pl-9"
        />
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : !parts.length ? (
          <EmptyState
            icon={<Package className="w-8 h-8" />}
            title="Nenhuma peça cadastrada"
            description="Cadastre as peças e materiais para usar nas ordens de serviço."
            action={
              <button className="btn-primary" onClick={openCreate}>
                <Plus className="w-4 h-4" /> Adicionar Peça
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800">
                    <th className="table-header">Nome</th>
                    <th className="table-header hidden sm:table-cell">Código</th>
                    <th className="table-header">Valor Unitário</th>
                    <th className="table-header hidden lg:table-cell">Cadastro</th>
                    <th className="table-header text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {paginated.map((part) => (
                    <tr key={part.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{part.name}</p>
                          {part.notes && (
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 truncate max-w-xs">
                              {part.notes}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="table-cell hidden sm:table-cell">
                        {part.code ? (
                          <span className="font-mono text-xs bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            {part.code}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="table-cell font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(part.unit_price)}
                      </td>
                      <td className="table-cell hidden lg:table-cell text-gray-500 dark:text-slate-400">
                        {formatDate(part.created_at)}
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/pecas/${part.id}`)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(part)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(part)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Modal criar/editar */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Editar Peça' : 'Nova Peça'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Nome da Peça" error={errors.name?.message} required>
            <input
              {...register('name')}
              className="input-field"
              placeholder="Ex: Tela LCD 6.1 polegadas"
              autoFocus
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Código / Referência" error={errors.code?.message}>
              <input
                {...register('code')}
                className="input-field font-mono"
                placeholder="Ex: TL-LCD-001"
              />
            </FormField>
            <FormField label="Valor Unitário (R$)" error={errors.unit_price?.message} required>
              <input
                {...register('unit_price')}
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                placeholder="0,00"
              />
            </FormField>
          </div>

          <FormField label="Observações" error={errors.notes?.message}>
            <textarea
              {...register('notes')}
              rows={2}
              className="input-field resize-none"
              placeholder="Informações adicionais sobre a peça..."
            />
          </FormField>

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-slate-700">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Salvando...' : editTarget ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Excluir Peça"
        message={`Excluir "${deleteTarget?.name}"? Ela não poderá ser removida se estiver vinculada a ordens de serviço.`}
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}