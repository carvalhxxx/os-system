import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, Wrench, CheckCircle, XCircle, Eye } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { techniciansService } from '../../services/technicians.service'
import { Technician, TechnicianInsert } from '../../types'
import { Modal, ConfirmDialog, EmptyState, PageLoader, FormField } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  phone: z.string().min(10, 'Telefone inválido'),
  specialty: z.string().optional(),
  active: z.boolean(),
})

type FormData = z.infer<typeof schema>

export default function TechniciansPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Technician | null>(null)
  const [editTarget, setEditTarget] = useState<Technician | null>(null)

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ['technicians', user?.id],
    queryFn: () => techniciansService.getAll(user!.id),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: (data: TechnicianInsert) => techniciansService.create(user!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['technicians'] })
      toast.success('Funcionário criado!')
      closeModal()
    },
    onError: () => toast.error('Erro ao criar funcionário'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TechnicianInsert }) =>
      techniciansService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['technicians'] })
      toast.success('Funcionário atualizado!')
      closeModal()
    },
    onError: () => toast.error('Erro ao atualizar funcionário'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => techniciansService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['technicians'] })
      toast.success('Funcionário excluído!')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Erro ao excluir funcionário'),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { active: true },
  })

  const openCreate = () => { setEditTarget(null); reset({ active: true }); setModalOpen(true) }
  const openEdit = (t: Technician) => { setEditTarget(t); reset({ ...t, specialty: t.specialty ?? '' }); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditTarget(null); reset({ active: true }) }

  const onSubmit = async (data: FormData) => {
    const payload: TechnicianInsert = {
      name: data.name,
      phone: data.phone,
      specialty: data.specialty || null,
      active: data.active,
    }
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const activeCount = technicians.filter(t => t.active).length

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Funcionários</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {activeCount} ativo{activeCount !== 1 ? 's' : ''} de {technicians.length} cadastrado{technicians.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Novo Funcionário
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : !technicians.length ? (
          <EmptyState
            icon={<Wrench className="w-8 h-8" />}
            title="Nenhum funcionário cadastrado"
            description="Cadastre seus funcionários para atribuí-los às ordens de serviço."
            action={
              <button className="btn-primary" onClick={openCreate}>
                <Plus className="w-4 h-4" /> Adicionar Funcionário
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800">
                  <th className="table-header">Nome</th>
                  <th className="table-header hidden sm:table-cell">Telefone</th>
                  <th className="table-header hidden md:table-cell">Especialidade</th>
                  <th className="table-header">Status</th>
                  <th className="table-header hidden lg:table-cell">Cadastro</th>
                  <th className="table-header text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {technicians.map((tech) => (
                  <tr key={tech.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="table-cell font-medium">{tech.name}</td>
                    <td className="table-cell hidden sm:table-cell">{tech.phone}</td>
                    <td className="table-cell hidden md:table-cell text-gray-500 dark:text-slate-400">
                      {tech.specialty || '—'}
                    </td>
                    <td className="table-cell">
                      {tech.active ? (
                        <span className="badge bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                          <CheckCircle className="w-3 h-3 mr-1" /> Ativo
                        </span>
                      ) : (
                        <span className="badge bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                          <XCircle className="w-3 h-3 mr-1" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="table-cell hidden lg:table-cell text-gray-500 dark:text-slate-400">
                      {formatDate(tech.created_at)}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/tecnicos/${tech.id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Ver perfil"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => openEdit(tech)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(tech)}
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
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editTarget ? 'Editar Funcionário' : 'Novo Funcionário'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Nome" error={errors.name?.message} required>
            <input {...register('name')} className="input-field" placeholder="Nome completo" />
          </FormField>
          <FormField label="Telefone" error={errors.phone?.message} required>
            <input {...register('phone')} className="input-field" placeholder="(11) 99999-9999" />
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
            <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
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
        title="Excluir Funcionário"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"?`}
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
