import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CreditCard, CheckCircle, Clock, AlertCircle,
  Plus, Trash2, Banknote, Zap, SmartphoneNfc,
  ArrowLeftRight, FileText, MoreHorizontal,
} from 'lucide-react'
import { ServiceOrder, PaymentMethod, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '.././types'
import { orderPaymentsService } from '.././services/orderPayments.service'
import { useAuth } from '.././hooks/useAuth'
import { formatCurrency, formatDate, localDateString } from '.././lib/utils'
import { FormField, ConfirmDialog } from './ui'
import toast from 'react-hot-toast'

const schema = z.object({
  amount:  z.coerce.number().min(0.01, 'Valor obrigatório'),
  method:  z.enum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto', 'outro']),
  paid_at: z.string().min(1, 'Data obrigatória'),
  notes:   z.string().optional(),
})
type FormData = z.infer<typeof schema>

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  dinheiro:       <Banknote className="w-3.5 h-3.5" />,
  pix:            <Zap className="w-3.5 h-3.5" />,
  cartao_credito: <CreditCard className="w-3.5 h-3.5" />,
  cartao_debito:  <SmartphoneNfc className="w-3.5 h-3.5" />,
  transferencia:  <ArrowLeftRight className="w-3.5 h-3.5" />,
  boleto:         <FileText className="w-3.5 h-3.5" />,
  outro:          <MoreHorizontal className="w-3.5 h-3.5" />,
}

interface PaymentPanelProps {
  order: ServiceOrder
  readOnly?: boolean
}

export function PaymentPanel({ order, readOnly = false }: PaymentPanelProps) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const remaining = order.service_value - (order.amount_paid || 0)
  const isPaid = order.payment_status === 'pago'

  const { data: payments = [] } = useQuery({
    queryKey: ['order-payments', order.id],
    queryFn: () => orderPaymentsService.getByOrderId(order.id),
    enabled: !!order.id,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount:  remaining > 0 ? remaining : order.service_value,
      method:  'pix',
      paid_at: localDateString(),
      notes:   '',
    },
  })

  const addMutation = useMutation({
    mutationFn: (data: FormData) =>
      orderPaymentsService.add(order.id, user!.id, {
        amount:  data.amount,
        method:  data.method as PaymentMethod,
        paid_at: data.paid_at,
        notes:   data.notes || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order-payments', order.id] })
      qc.invalidateQueries({ queryKey: ['order', order.id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['receivables'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Pagamento adicionado!')
      setShowForm(false)
      reset({ amount: 0, method: 'pix', paid_at: localDateString(), notes: '' })
    },
    onError: () => toast.error('Erro ao adicionar pagamento'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => orderPaymentsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order-payments', order.id] })
      qc.invalidateQueries({ queryKey: ['order', order.id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['receivables'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Pagamento removido!')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Erro ao remover pagamento'),
  })

  const statusIcon = isPaid
    ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
    : order.payment_status === 'pago_parcial'
    ? <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    : <Clock className="w-4 h-4 text-red-500 dark:text-red-400" />

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-500 dark:text-slate-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Pagamento</h3>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${PAYMENT_STATUS_COLORS[order.payment_status]}`}>
          {statusIcon}
          {PAYMENT_STATUS_LABELS[order.payment_status]}
        </span>
      </div>

      {/* Resumo */}
      <div className="px-6 py-4 grid grid-cols-3 gap-4 bg-gray-50 dark:bg-slate-900/40 border-b border-gray-200 dark:border-slate-700">
        <div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Total</p>
          <p className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(order.service_value)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Recebido</p>
          <p className={`text-base font-bold ${isPaid ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-slate-300'}`}>
            {formatCurrency(order.amount_paid || 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">A receber</p>
          <p className={`text-base font-bold ${remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-slate-600'}`}>
            {formatCurrency(remaining > 0 ? remaining : 0)}
          </p>
        </div>
      </div>

      {/* Histórico de pagamentos */}
      <div className="px-6 py-4 space-y-2">
        {payments.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-2">Nenhum pagamento registrado</p>
        ) : (
          payments.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-900/40 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 text-green-600 dark:text-green-400">
                {METHOD_ICONS[p.method]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{formatCurrency(p.amount)}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  {PAYMENT_METHOD_LABELS[p.method]} · {formatDate(p.paid_at)}
                  {p.notes && ` · ${p.notes}`}
                </p>
              </div>
              {!readOnly && (
                <button
                  onClick={() => setDeleteTarget(p.id)}
                  className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Formulário de novo pagamento */}
      {!readOnly && !isPaid && (
        <div className="px-6 pb-5 border-t border-gray-100 dark:border-slate-800 pt-4">
          {!showForm ? (
            <button
              onClick={() => {
                reset({ amount: remaining > 0 ? remaining : order.service_value, method: 'pix', paid_at: localDateString(), notes: '' })
                setShowForm(true)
              }}
              className="btn-primary w-full justify-center"
            >
              <Plus className="w-4 h-4" /> Adicionar Pagamento
            </button>
          ) : (
            <form onSubmit={handleSubmit(d => addMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Valor (R$)" error={errors.amount?.message} required>
                  <input {...register('amount')} type="number" step="0.01" min="0.01" className="input-field" />
                </FormField>
                <FormField label="Data" error={errors.paid_at?.message} required>
                  <input {...register('paid_at')} type="date" className="input-field" />
                </FormField>
              </div>
              <FormField label="Forma de Pagamento" error={errors.method?.message} required>
                <select {...register('method')} className="input-field">
                  {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Observações" error={errors.notes?.message}>
                <input {...register('notes')} className="input-field" placeholder="Ex: Parcela 1 de 2..." />
              </FormField>
              <div className="flex gap-3 justify-end">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Remover Pagamento"
        message="Tem certeza que deseja remover este pagamento? O saldo será recalculado automaticamente."
        confirmLabel="Remover"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}