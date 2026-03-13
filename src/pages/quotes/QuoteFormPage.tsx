import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Save, FileText, Package, ClipboardList,
  CheckCircle, XCircle, Download, Printer,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { quotesService } from '../../services/quotes.service'
import { QuoteItemsPanel } from '../../components/QuoteItemsPanel'
import { FormField, PageLoader, ConfirmDialog } from '../../components/ui'
import { ClientPicker } from '../../components/ClientPicker'
import { TechnicianPicker } from '../../components/TechnicianPicker'
import { exportQuoteToPDF } from '../../lib/pdf'
import { useCompanySettings } from '../../hooks/useCompanySettings'
import toast from 'react-hot-toast'

const schema = z.object({
  client_id:    z.string().min(1, 'Selecione um cliente'),
  technician_id: z.string().optional(),
  description:  z.string().min(5, 'Descreva o serviço'),
  notes:        z.string().optional(),
  labor_value:  z.coerce.number().min(0),
})
type FormData = z.infer<typeof schema>

type Tab = 'dados' | 'itens'

export default function QuoteFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEditing = !!id
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { settings } = useCompanySettings()

  const [tab, setTab] = useState<Tab>('dados')
  const [approveConfirm, setApproveConfirm] = useState(false)
  const [refuseConfirm, setRefuseConfirm] = useState(false)
  const [approving, setApproving] = useState(false)

  // Item form state

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => quotesService.getById(id!),
    enabled: isEditing,
    staleTime: 0,
  })


  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { labor_value: 0 },
  })

  useEffect(() => {
    if (quote) {
      reset({
        client_id:     quote.client_id,
        technician_id: quote.technician_id || '',
        description:   quote.description,
        notes:         quote.notes || '',
        labor_value:   quote.labor_value,
      })
    }
  }, [quote, reset])

  const createMutation = useMutation({
    mutationFn: (data: FormData) => quotesService.create(user!.id, {
      client_id: data.client_id,
      technician_id: data.technician_id || null,
      description: data.description,
      notes: data.notes || null,
      labor_value: data.labor_value,
    }),
    onSuccess: (q) => {
      qc.invalidateQueries({ queryKey: ['quotes'] })
      toast.success(`${q.quote_number} criado!`)
      navigate(`/orcamentos/${q.id}`)
    },
    onError: () => toast.error('Erro ao criar orçamento'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => quotesService.update(id!, {
      client_id: data.client_id,
      technician_id: data.technician_id || null,
      description: data.description,
      notes: data.notes || null,
      labor_value: data.labor_value,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote', id] })
      qc.invalidateQueries({ queryKey: ['quotes'] })
      toast.success('Orçamento atualizado!')
    },
    onError: () => toast.error('Erro ao atualizar'),
  })




  const refuseMutation = useMutation({
    mutationFn: () => quotesService.update(id!, { status: 'recusado' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote', id] })
      qc.invalidateQueries({ queryKey: ['quotes'] })
      toast.success('Orçamento marcado como recusado')
      setRefuseConfirm(false)
    },
  })

  async function handleApprove() {
    if (!quote) return
    setApproving(true)
    try {
      const orderId = await quotesService.approve(quote.id)
      qc.invalidateQueries({ queryKey: ['quotes'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Orçamento aprovado! OS criada.')
      navigate(`/ordens/${orderId}`)
    } catch {
      toast.error('Erro ao aprovar orçamento')
    } finally {
      setApproving(false)
      setApproveConfirm(false)
    }
  }





  const onSubmit = (data: FormData) => isEditing ? updateMutation.mutate(data) : createMutation.mutate(data)

  if (isEditing && isLoading) return <PageLoader />

  const isPending = quote?.status === 'pendente'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/orcamentos')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditing ? quote?.quote_number : 'Novo Orçamento'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              {quote?.client?.name || 'Preencha os dados do orçamento'}
            </p>
          </div>
        </div>

        {/* Ações do cabeçalho */}
        {isEditing && quote && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => exportQuoteToPDF(quote, 'download', settings)} className="btn-secondary text-sm">
              <Download className="w-4 h-4" /> PDF
            </button>
            <button onClick={() => exportQuoteToPDF(quote, 'print', settings)} className="btn-secondary text-sm">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            {isPending && (
              <>
                <button onClick={() => setRefuseConfirm(true)} className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20">
                  <XCircle className="w-4 h-4" /> Recusar
                </button>
                <button onClick={() => setApproveConfirm(true)} className="btn-primary text-sm bg-green-600 hover:bg-green-700 border-green-600">
                  <CheckCircle className="w-4 h-4" /> Aprovar → OS
                </button>
              </>
            )}
            {quote.status === 'aprovado' && quote.converted_order_id && (
              <button onClick={() => navigate(`/ordens/${quote.converted_order_id}`)} className="btn-secondary text-sm text-green-600">
                <ClipboardList className="w-4 h-4" /> Ver OS gerada
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status badge */}
      {isEditing && quote && (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
          quote.status === 'pendente'  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
          quote.status === 'aprovado' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {quote.status === 'pendente' ? <FileText className="w-4 h-4" /> : quote.status === 'aprovado' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {quote.status === 'pendente' ? 'Pendente' : quote.status === 'aprovado' ? 'Aprovado' : 'Recusado'}
        </div>
      )}

      {/* Tabs */}
      {isEditing && (
        <div className="flex border-b border-gray-200 dark:border-slate-700 gap-1">
          {([
            { key: 'dados', label: 'Dados',  icon: <FileText className="w-4 h-4" /> },
            { key: 'itens', label: 'Peças',  icon: <Package className="w-4 h-4" /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.key
                  ? 'border-green-600 text-green-600 dark:text-green-400 dark:border-green-400'
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
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Dados do Orçamento</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Cliente" error={errors.client_id?.message} required>
                <ClientPicker
                  value={watch('client_id') || ''}
                  onChange={id => setValue('client_id', id, { shouldValidate: true })}
                  error={errors.client_id?.message}
                />
              </FormField>
              <FormField label="Funcionário Responsável">
                <TechnicianPicker
                  value={watch('technician_id') || ''}
                  onChange={id => setValue('technician_id', id || undefined)}
                />
              </FormField>
            </div>
            <FormField label="Descrição do Serviço" error={errors.description?.message} required>
              <textarea {...register('description')} rows={3} className="input-field resize-none"
                placeholder="Descreva o serviço a ser realizado..." />
            </FormField>
            <FormField label="Mão de Obra (R$)" error={errors.labor_value?.message} required>
              <input {...register('labor_value')} type="number" step="0.01" min="0" className="input-field max-w-xs" placeholder="0.00" />
            </FormField>
            <FormField label="Observações">
              <textarea {...register('notes')} rows={2} className="input-field resize-none"
                placeholder="Condições, validade, informações adicionais..." />
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pb-6">
            <button type="button" className="btn-secondary" onClick={() => navigate('/orcamentos')}>Cancelar</button>
            <button type="submit" disabled={isSubmitting || !isPending && isEditing} className="btn-primary px-6">
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Orçamento'}
            </button>
          </div>
        </form>
      )}

      {/* ── ABA ITENS ── */}
      {tab === 'itens' && isEditing && (
        <div className="space-y-4">
          <QuoteItemsPanel
            quoteId={id!}
            laborValue={quote?.labor_value ?? 0}
            onTotalChange={() => qc.invalidateQueries({ queryKey: ['quote', id] })}
            readOnly={!isPending}
          />
          <div className="flex justify-end pb-6">
            <button onClick={() => navigate('/orcamentos')} className="btn-secondary">Concluir</button>
          </div>
        </div>
      )}

      {/* Confirms */}
      <ConfirmDialog
        open={approveConfirm}
        onClose={() => setApproveConfirm(false)}
        onConfirm={handleApprove}
        title="Aprovar Orçamento"
        message="Isso criará uma nova Ordem de Serviço com os dados deste orçamento. Deseja continuar?"
        confirmLabel="Aprovar e Criar OS"
        loading={approving}
      />
      <ConfirmDialog
        open={refuseConfirm}
        onClose={() => setRefuseConfirm(false)}
        onConfirm={() => refuseMutation.mutate()}
        title="Recusar Orçamento"
        message="Deseja marcar este orçamento como recusado?"
        confirmLabel="Recusar"
        loading={refuseMutation.isPending}
      />
    </div>
  )
}