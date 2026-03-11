import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CreditCard, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp,
  Banknote, Zap, SmartphoneNfc, ArrowLeftRight, FileText, MoreHorizontal,
  CalendarDays,
} from 'lucide-react'
import {
  ServiceOrder, PaymentMethod,
  PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
} from '.././types'
import { paymentsService, RegisterPaymentInput } from '.././services/payments.service'
import { formatCurrency, formatDate } from '.././lib/utils'
import { FormField } from './ui'
import toast from 'react-hot-toast'

const schema = z.object({
  payment_status: z.enum(['pago', 'pago_parcial']),
  payment_method: z.enum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto', 'outro']),
  amount_paid: z.coerce.number().min(0),
  payment_date: z.string().min(1, 'Informe a data'),
  payment_notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// SVG icons por método de pagamento
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
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(order.payment_status !== 'pago')

  const isPaid    = order.payment_status === 'pago'
  const isPartial = order.payment_status === 'pago_parcial'
  const isPending = order.payment_status === 'pendente'
  const remaining = order.service_value - (order.amount_paid || 0)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      payment_status:  isPaid ? 'pago' : isPartial ? 'pago_parcial' : 'pago',
      payment_method:  (order.payment_method as PaymentMethod) || 'pix',
      amount_paid:     isPaid || isPartial ? order.amount_paid : order.service_value,
      payment_date:    order.payment_date
        ? order.payment_date.split('T')[0]
        : new Date().toISOString().split('T')[0],
      payment_notes:   order.payment_notes || '',
    },
  })

  const watchStatus = watch('payment_status')

  const mutation = useMutation({
    mutationFn: (data: RegisterPaymentInput) => paymentsService.registerPayment(order.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', order.id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['receivables'] })
      qc.invalidateQueries({ queryKey: ['receivable-stats'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Pagamento registrado!')
      setExpanded(false)
    },
    onError: () => toast.error('Erro ao registrar pagamento'),
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      payment_status: data.payment_status,
      payment_method: data.payment_method as PaymentMethod,
      amount_paid: data.payment_status === 'pago' ? order.service_value : data.amount_paid,
      payment_date: data.payment_date,
      payment_notes: data.payment_notes,
    })
  }

  const statusIcon = isPaid
    ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
    : isPartial
    ? <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    : <Clock className="w-4 h-4 text-red-500 dark:text-red-400" />

  return (
    <div className="card overflow-hidden">
      {/* Header clicável */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-500 dark:text-slate-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
            Pagamento
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${PAYMENT_STATUS_COLORS[order.payment_status]}`}>
            {statusIcon}
            {PAYMENT_STATUS_LABELS[order.payment_status]}
          </span>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Resumo: valores */}
      <div className="px-6 py-4 grid grid-cols-3 gap-4 bg-gray-50 dark:bg-slate-900/40 border-b border-gray-200 dark:border-slate-700">
        <div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Valor total</p>
          <p className="text-base font-bold text-gray-900 dark:text-white">
            {formatCurrency(order.service_value)}
          </p>
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

      {/* Detalhe quando já registrado e fechado */}
      {!isPending && !expanded && (
        <div className="px-6 py-3 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-slate-400">
          {order.payment_method && (
            <span className="flex items-center gap-1.5">
              {METHOD_ICONS[order.payment_method]}
              {PAYMENT_METHOD_LABELS[order.payment_method]}
            </span>
          )}
          {order.payment_date && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {formatDate(order.payment_date)}
            </span>
          )}
          {order.payment_notes && (
            <span className="text-gray-400 dark:text-slate-500 italic text-xs">
              "{order.payment_notes}"
            </span>
          )}
          {!readOnly && (
            <button
              onClick={() => setExpanded(true)}
              className="text-blue-600 dark:text-blue-400 text-xs hover:underline ml-auto"
            >
              Editar
            </button>
          )}
        </div>
      )}

      {/* Formulário */}
      {expanded && !readOnly && (
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {/* Tipo de pagamento */}
          <div className="grid grid-cols-2 gap-3">
            {(['pago', 'pago_parcial'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setValue('payment_status', s)
                  if (s === 'pago') setValue('amount_paid', order.service_value)
                }}
                className={`py-2.5 px-4 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  watchStatus === s
                    ? s === 'pago'
                      ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 dark:border-green-500'
                      : 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-500'
                    : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-gray-300'
                }`}
              >
                {s === 'pago'
                  ? <><CheckCircle className="w-4 h-4" /> Pago integralmente</>
                  : <><AlertCircle className="w-4 h-4" /> Pagamento parcial</>
                }
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Forma de Pagamento" error={errors.payment_method?.message} required>
              <select {...register('payment_method')} className="input-field">
                {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Data do Pagamento" error={errors.payment_date?.message} required>
              <input {...register('payment_date')} type="date" className="input-field" />
            </FormField>
          </div>

          {watchStatus === 'pago_parcial' && (
            <FormField label="Valor Recebido (R$)" error={errors.amount_paid?.message} required>
              <input
                {...register('amount_paid')}
                type="number" step="0.01" min="0"
                max={order.service_value}
                className="input-field max-w-xs"
              />
            </FormField>
          )}

          <FormField label="Observações" error={errors.payment_notes?.message}>
            <input
              {...register('payment_notes')}
              className="input-field"
              placeholder="Ex: Parcelado em 2x no crédito..."
            />
          </FormField>

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-slate-700">
            <button type="button" className="btn-secondary" onClick={() => setExpanded(false)}>
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Salvando...' : 'Registrar Pagamento'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
