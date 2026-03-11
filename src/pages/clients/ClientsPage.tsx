import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Edit2, Trash2, Users, Eye } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { clientsService } from '../../services/clients.service'
import { Client, ClientInsert } from '../../types'
import { Modal, ConfirmDialog, EmptyState, PageLoader, FormField, Pagination } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido').or(z.literal('')).optional(),
  document: z.string().min(11, 'CPF/CNPJ inválido'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const PER_PAGE = 10

export default function ClientsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [editTarget, setEditTarget] = useState<Client | null>(null)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', user?.id, search],
    queryFn: () => clientsService.getAll(user!.id, search || undefined),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: (data: ClientInsert) => clientsService.create(user!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente criado!')
      closeModal()
    },
    onError: () => toast.error('Erro ao criar cliente'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClientInsert }) =>
      clientsService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente atualizado!')
      closeModal()
    },
    onError: () => toast.error('Erro ao atualizar cliente'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente excluído!')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Erro ao excluir cliente'),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const openCreate = () => {
    setEditTarget(null)
    reset({})
    setModalOpen(true)
  }

  const openEdit = (client: Client) => {
    setEditTarget(client)
    reset({
      name:     client.name,
      phone:    client.phone,
      email:    client.email    ?? '',
      document: client.document,
      address:  client.address  ?? '',
      city:     client.city     ?? '',
      state:    client.state    ?? '',
      zip_code: client.zip_code ?? '',
      notes:    client.notes    ?? '',
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditTarget(null)
    reset({})
  }

  const onSubmit = async (data: FormData) => {
    const payload: ClientInsert = {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      document: data.document,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip_code: data.zip_code || null,
      notes: data.notes || null,
    }
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  // Pagination
  const total = clients.length
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const paginated = clients.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {total} cliente{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="input-field pl-9"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : !clients.length ? (
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="Nenhum cliente cadastrado"
            description="Adicione seus clientes para começar a criar ordens de serviço."
            action={
              <button className="btn-primary" onClick={openCreate}>
                <Plus className="w-4 h-4" /> Adicionar Cliente
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
                    <th className="table-header hidden sm:table-cell">Telefone</th>
                    <th className="table-header hidden md:table-cell">CPF/CNPJ</th>
                    <th className="table-header hidden lg:table-cell">Email</th>
                    <th className="table-header hidden xl:table-cell">Cadastro</th>
                    <th className="table-header text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {paginated.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="table-cell font-medium">{client.name}</td>
                      <td className="table-cell hidden sm:table-cell">{client.phone}</td>
                      <td className="table-cell hidden md:table-cell font-mono text-xs">{client.document}</td>
                      <td className="table-cell hidden lg:table-cell text-gray-500 dark:text-slate-400">
                        {client.email || '—'}
                      </td>
                      <td className="table-cell hidden xl:table-cell text-gray-500 dark:text-slate-400">
                        {formatDate(client.created_at)}
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/clientes/${client.id}`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Ver perfil"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => openEdit(client)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(client)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Excluir"
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

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editTarget ? 'Editar Cliente' : 'Novo Cliente'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nome" error={errors.name?.message} required>
              <input {...register('name')} className="input-field" placeholder="Nome completo" />
            </FormField>
            <FormField label="Telefone" error={errors.phone?.message} required>
              <input {...register('phone')} className="input-field" placeholder="(11) 99999-9999" />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="CPF / CNPJ" error={errors.document?.message} required>
              <input {...register('document')} className="input-field" placeholder="000.000.000-00" />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" className="input-field" placeholder="email@exemplo.com" />
            </FormField>
          </div>

          <FormField label="Endereço" error={errors.address?.message}>
            <input {...register('address')} className="input-field" placeholder="Rua, número, bairro" />
          </FormField>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <FormField label="Cidade" error={errors.city?.message}>
                <input {...register('city')} className="input-field" placeholder="Cidade" />
              </FormField>
            </div>
            <FormField label="Estado" error={errors.state?.message}>
              <input {...register('state')} className="input-field" placeholder="SP" maxLength={2} />
            </FormField>
            <FormField label="CEP" error={errors.zip_code?.message}>
              <input {...register('zip_code')} className="input-field" placeholder="00000-000" />
            </FormField>
          </div>

          <FormField label="Observações" error={errors.notes?.message}>
            <textarea {...register('notes')} rows={3} className="input-field resize-none" placeholder="Informações adicionais..." />
          </FormField>

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-slate-700">
            <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Salvando...' : editTarget ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Excluir Cliente"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}