import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Info } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ordersService } from '../../services/orders.service'
import { ServiceOrderInsert, OrderStatus } from '../../types'
import { FormField, PageLoader } from '../../components/ui'
import { ClientPicker } from '../../components/ClientPicker'
import { TechnicianPicker } from '../../components/TechnicianPicker'
import toast from 'react-hot-toast'

const schema = z.object({
  client_id: z.string().min(1, 'Selecione um cliente'),
  technician_id: z.string().optional(),
  problem_description: z.string().min(5, 'Descreva o problema'),
  diagnosis: z.string().optional(),
  service_performed: z.string().optional(),
  labor_value: z.coerce.number().min(0, 'Valor inválido'),
  status: z.enum(['aberta', 'em_andamento', 'aguardando_peca', 'finalizada', 'cancelada']),
  opened_at: z.string().min(1, 'Data de abertura obrigatória'),
  closed_at: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'aguardando_peca', label: 'Aguardando Peça' },
  { value: 'finalizada', label: 'Finalizada' },
  { value: 'cancelada', label: 'Cancelada' },
]

export default function OrderFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEditing = !!id
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: order, isLoading: loadingOrder } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersService.getById(id!),
    enabled: isEditing,
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'aberta',
      labor_value: 0,
      opened_at: new Date().toISOString().split('T')[0],
    },
  })

  useEffect(() => {
    if (order) {
      // Bloqueia edição de OS finalizada ou cancelada
      if (order.status === 'finalizada' || order.status === 'cancelada') {
        toast.error('Esta OS está finalizada e não pode ser editada.')
        navigate(`/ordens/${id}`, { replace: true })
        return
      }
      reset({
        client_id: order.client_id,
        technician_id: order.technician_id || '',
        problem_description: order.problem_description,
        diagnosis: order.diagnosis || '',
        service_performed: order.service_performed || '',
        labor_value: order.labor_value ?? order.service_value,
        status: order.status,
        opened_at: order.opened_at?.split('T')[0] || '',
        closed_at: order.closed_at?.split('T')[0] || '',
        notes: order.notes || '',
      })
    }
  }, [order, reset])

  const createMutation = useMutation({
    mutationFn: (data: ServiceOrderInsert) => ordersService.create(user!.id, data),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success(`OS ${order.order_number} criada! Adicione as peças na tela de detalhes.`)
      navigate(`/ordens/${order.id}`)
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
      navigate(`/ordens/${id}`)
    },
    onError: () => toast.error('Erro ao atualizar ordem'),
  })

  const onSubmit = (data: FormData) => {
    const payload: ServiceOrderInsert = {
      client_id: data.client_id,
      technician_id: data.technician_id || null,
      problem_description: data.problem_description,
      diagnosis: data.diagnosis || null,
      service_performed: data.service_performed || null,
      labor_value: data.labor_value,
      service_value: data.labor_value, // será recalculado ao adicionar peças
      status: data.status,
      opened_at: data.opened_at,
      closed_at: data.closed_at || null,
      notes: data.notes || null,
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
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? `Editar ${order?.order_number}` : 'Nova Ordem de Serviço'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {isEditing ? 'Atualize as informações da ordem' : 'Preencha os dados da nova ordem'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Client and Technician */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
            Dados Principais
          </h2>
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
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
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
            <div className="flex items-start gap-3">
              <input
                {...register('labor_value')}
                type="number"
                step="0.01"
                min="0"
                className="input-field max-w-xs"
                placeholder="0.00"
              />
            </div>
          </FormField>

          {/* Info sobre peças */}
          <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-3">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              As peças e materiais são adicionadas na tela de detalhes da OS após salvar.
              O valor total será calculado automaticamente somando mão de obra + peças.
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
            Descrições
          </h2>
          <FormField label="Descrição do Problema" error={errors.problem_description?.message} required>
            <textarea
              {...register('problem_description')}
              rows={4}
              className="input-field resize-none"
              placeholder="Descreva o problema relatado pelo cliente..."
            />
          </FormField>
          <FormField label="Diagnóstico" error={errors.diagnosis?.message}>
            <textarea
              {...register('diagnosis')}
              rows={3}
              className="input-field resize-none"
              placeholder="Diagnóstico funcionário após análise..."
            />
          </FormField>
          <FormField label="Serviço Realizado" error={errors.service_performed?.message}>
            <textarea
              {...register('service_performed')}
              rows={3}
              className="input-field resize-none"
              placeholder="Descreva o que foi realizado..."
            />
          </FormField>
          <FormField label="Observações" error={errors.notes?.message}>
            <textarea
              {...register('notes')}
              rows={2}
              className="input-field resize-none"
              placeholder="Outras observações..."
            />
          </FormField>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate(-1)}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary px-6"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Ordem'}
          </button>
        </div>
      </form>
    </div>
  )
}
