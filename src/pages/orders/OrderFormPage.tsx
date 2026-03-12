import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Save, ClipboardList, Package, Paperclip,
  Upload, FileText, Image, X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ordersService } from '../../services/orders.service'
import { attachmentsService } from '../../services/attachments.service'
import { ServiceOrderInsert, OrderStatus } from '../../types'
import { FormField, PageLoader, ConfirmDialog } from '../../components/ui'
import { ClientPicker } from '../../components/ClientPicker'
import { TechnicianPicker } from '../../components/TechnicianPicker'
import { OrderItemsPanel } from '../../components/OrderItemsPanel'
import { formatFileSize } from '../../lib/utils'
import toast from 'react-hot-toast'

const schema = z.object({
  client_id:           z.string().min(1, 'Selecione um cliente'),
  technician_id:       z.string().optional(),
  problem_description: z.string().min(5, 'Descreva o problema'),
  diagnosis:           z.string().optional(),
  service_performed:   z.string().optional(),
  labor_value:         z.coerce.number().min(0, 'Valor inválido'),
  status:              z.enum(['aberta', 'em_andamento', 'aguardando_peca', 'finalizada', 'cancelada']),
  opened_at:           z.string().min(1, 'Data de abertura obrigatória'),
  closed_at:           z.string().optional(),
  notes:               z.string().optional(),
})

type FormData = z.infer<typeof schema>

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'aberta',          label: 'Aberta' },
  { value: 'em_andamento',    label: 'Em Andamento' },
  { value: 'aguardando_peca', label: 'Aguardando Peça' },
  { value: 'finalizada',      label: 'Finalizada' },
  { value: 'cancelada',       label: 'Cancelada' },
]

type Tab = 'dados' | 'pecas' | 'anexos'

export default function OrderFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEditing = !!id
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<Tab>('dados')
  const [uploading, setUploading] = useState(false)
  const [deleteAttachment, setDeleteAttachment] = useState<string | null>(null)

  const { data: order, isLoading: loadingOrder } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersService.getById(id!),
    enabled: isEditing,
    staleTime: 0,
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status:      'aberta',
      labor_value: 0,
      opened_at:   new Date().toISOString().split('T')[0],
    },
  })

  useEffect(() => {
    if (order) {
      reset({
        client_id:           order.client_id,
        technician_id:       order.technician_id || '',
        problem_description: order.problem_description,
        diagnosis:           order.diagnosis || '',
        service_performed:   order.service_performed || '',
        labor_value:         order.labor_value ?? order.service_value,
        status:              order.status,
        opened_at:           order.opened_at?.split('T')[0] || '',
        closed_at:           order.closed_at?.split('T')[0] || '',
        notes:               order.notes || '',
      })
    }
  }, [order, reset])

  const createMutation = useMutation({
    mutationFn: (data: ServiceOrderInsert) => ordersService.create(user!.id, data),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success(`OS ${order.order_number} criada!`)
      navigate(`/ordens/${order.id}/editar`)
    },
    onError: () => toast.error('Erro ao criar ordem'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: ServiceOrderInsert) => ordersService.update(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Ordem atualizada!')
    },
    onError: () => toast.error('Erro ao atualizar ordem'),
  })

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachId: string) => {
      const att = order?.attachments?.find(a => a.id === attachId)
      if (!att) throw new Error('Not found')
      return attachmentsService.delete(att)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] })
      toast.success('Anexo removido!')
      setDeleteAttachment(null)
    },
    onError: () => toast.error('Erro ao remover anexo'),
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length || !user || !id) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        await attachmentsService.upload(user.id, id, file)
      }
      qc.invalidateQueries({ queryKey: ['order', id] })
      toast.success(`${files.length} arquivo(s) enviado(s)!`)
    } catch {
      toast.error('Erro ao enviar arquivo')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onSubmit = (data: FormData) => {
    const payload: ServiceOrderInsert = {
      client_id:           data.client_id,
      technician_id:       data.technician_id || null,
      problem_description: data.problem_description,
      diagnosis:           data.diagnosis || null,
      service_performed:   data.service_performed || null,
      labor_value:         data.labor_value,
      service_value:       data.labor_value,
      status:              data.status,
      opened_at:           data.opened_at,
      closed_at:           data.closed_at || null,
      notes:               data.notes || null,
    }
    if (isEditing) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  if (isEditing && loadingOrder) return <PageLoader />

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(isEditing ? `/ordens/${id}` : (-1 as any))}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? `Editar ${order?.order_number}` : 'Nova Ordem de Serviço'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {isEditing ? 'Edite os dados, peças e anexos da OS' : 'Preencha os dados da nova ordem'}
          </p>
        </div>
      </div>

      {/* Tabs — só ao editar */}
      {isEditing && (
        <div className="flex border-b border-gray-200 dark:border-slate-700 gap-1">
          {([
            { key: 'dados',  label: 'Dados',  icon: <ClipboardList className="w-4 h-4" /> },
            { key: 'pecas',  label: 'Peças',  icon: <Package className="w-4 h-4" /> },
            { key: 'anexos', label: 'Anexos', icon: <Paperclip className="w-4 h-4" /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── ABA DADOS ── */}
      {tab === 'dados' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Dados Principais</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Cliente" error={errors.client_id?.message} required>
                <ClientPicker
                  value={watch('client_id') || ''}
                  onChange={(id) => setValue('client_id', id, { shouldValidate: true })}
                  error={errors.client_id?.message}
                />
              </FormField>
              <FormField label="Funcionário Responsável">
                <TechnicianPicker
                  value={watch('technician_id') || ''}
                  onChange={(id) => setValue('technician_id', id || undefined, { shouldValidate: true })}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Status" error={errors.status?.message} required>
                <select {...register('status')} className="input-field">
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
              <FormField label="Data de Abertura" error={errors.opened_at?.message} required>
                <input {...register('opened_at')} type="date" className="input-field" />
              </FormField>
              <FormField label="Data de Conclusão" error={errors.closed_at?.message}>
                <input {...register('closed_at')} type="date" className="input-field" />
              </FormField>
            </div>
            <FormField label="Mão de Obra (R$)" error={errors.labor_value?.message} required>
              <input {...register('labor_value')} type="number" step="0.01" min="0" className="input-field max-w-xs" placeholder="0.00" />
            </FormField>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Descrições</h2>
            <FormField label="Descrição do Problema" error={errors.problem_description?.message} required>
              <textarea {...register('problem_description')} rows={3} className="input-field resize-none" placeholder="Descreva o problema relatado pelo cliente..." />
            </FormField>
            <FormField label="Diagnóstico" error={errors.diagnosis?.message}>
              <textarea {...register('diagnosis')} rows={3} className="input-field resize-none" placeholder="Diagnóstico do funcionário após análise..." />
            </FormField>
            <FormField label="Serviço Realizado" error={errors.service_performed?.message}>
              <textarea {...register('service_performed')} rows={3} className="input-field resize-none" placeholder="Descreva o que foi realizado..." />
            </FormField>
            <FormField label="Observações" error={errors.notes?.message}>
              <textarea {...register('notes')} rows={2} className="input-field resize-none" placeholder="Outras observações..." />
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-3 pb-6">
            <button type="button" className="btn-secondary" onClick={() => navigate(isEditing ? `/ordens/${id}` : (-1 as any))}>
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary px-6">
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Ordem'}
            </button>
          </div>
        </form>
      )}

      {/* ── ABA PEÇAS ── */}
      {tab === 'pecas' && isEditing && (
        <div className="space-y-4">
          <OrderItemsPanel
            orderId={id!}
            laborValue={order?.labor_value ?? 0}
            onTotalChange={() => qc.invalidateQueries({ queryKey: ['order', id] })}
            readOnly={false}
          />
          <div className="flex justify-end pb-6">
            <button onClick={() => navigate(`/ordens/${id}`)} className="btn-secondary">Concluir</button>
          </div>
        </div>
      )}

      {/* ── ABA ANEXOS ── */}
      {tab === 'anexos' && isEditing && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                Anexos ({order?.attachments?.length || 0})
              </h3>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary text-sm">
                {uploading ? 'Enviando...' : <><Upload className="w-4 h-4" /> Anexar</>}
              </button>
              <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleUpload} />
            </div>

            {!order?.attachments?.length ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
                <Paperclip className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-slate-400">Nenhum anexo</p>
                <button onClick={() => fileRef.current?.click()} className="text-xs text-blue-600 mt-1 hover:underline">
                  Clique para anexar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {order.attachments.map(att => {
                  const isImage = att.file_type.startsWith('image/')
                  return (
                    <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-900/50">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                        {isImage ? <Image className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate">{att.file_name}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{formatFileSize(att.file_size)}</p>
                      </div>
                      <button onClick={() => setDeleteAttachment(att.id)} className="p-1.5 rounded text-gray-400 hover:text-red-600 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pb-6">
            <button onClick={() => navigate(`/ordens/${id}`)} className="btn-secondary">Concluir</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteAttachment}
        onClose={() => setDeleteAttachment(null)}
        onConfirm={() => deleteAttachment && deleteAttachmentMutation.mutate(deleteAttachment)}
        title="Remover Anexo"
        message="Tem certeza que deseja remover este anexo?"
        confirmLabel="Remover"
        loading={deleteAttachmentMutation.isPending}
      />
    </div>
  )
}