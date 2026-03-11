import { supabase } from '../lib/supabase'
import { PaymentMethod, PaymentStatus, ServiceOrder } from '../types'

export interface RegisterPaymentInput {
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  amount_paid: number
  payment_date: string       // ISO date string
  payment_notes?: string
}

export interface ReceivableStats {
  total_receivable: number   // a receber (pendente + parcial)
  total_paid: number         // recebido no período
  total_overdue: number      // finalizada há +7d sem pagamento
  count_pending: number
  count_partial: number
  count_paid: number
}

export const paymentsService = {
  // Registra ou atualiza o pagamento de uma OS
  async registerPayment(orderId: string, input: RegisterPaymentInput): Promise<void> {
    const { error } = await supabase
      .from('service_orders')
      .update({
        payment_status: input.payment_status,
        payment_method: input.payment_method,
        amount_paid:    input.amount_paid,
        payment_date:   input.payment_date,
        payment_notes:  input.payment_notes || null,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', orderId)

    if (error) throw error
  },

  // Busca todas as OS finalizadas com info de pagamento
  async getReceivables(userId: string, paymentStatus?: PaymentStatus): Promise<ServiceOrder[]> {
    let query = supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(id, name, phone)
      `)
      .eq('user_id', userId)
      .eq('status', 'finalizada')
      .order('closed_at', { ascending: false })

    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as ServiceOrder[]
  },

  // Resumo financeiro de recebimentos
  async getStats(userId: string): Promise<ReceivableStats> {
    const { data, error } = await supabase
      .from('service_orders')
      .select('payment_status, service_value, amount_paid, closed_at')
      .eq('user_id', userId)
      .eq('status', 'finalizada')

    if (error) throw error
    const rows = data || []

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    let total_receivable = 0
    let total_paid = 0
    let total_overdue = 0
    let count_pending = 0
    let count_partial = 0
    let count_paid = 0

    for (const r of rows) {
      if (r.payment_status === 'pago') {
        total_paid += r.service_value || 0
        count_paid++
      } else if (r.payment_status === 'pago_parcial') {
        total_receivable += (r.service_value || 0) - (r.amount_paid || 0)
        total_paid += r.amount_paid || 0
        count_partial++
        if (r.closed_at && new Date(r.closed_at) < sevenDaysAgo) {
          total_overdue += (r.service_value || 0) - (r.amount_paid || 0)
        }
      } else {
        // pendente
        total_receivable += r.service_value || 0
        count_pending++
        if (r.closed_at && new Date(r.closed_at) < sevenDaysAgo) {
          total_overdue += r.service_value || 0
        }
      }
    }

    return {
      total_receivable,
      total_paid,
      total_overdue,
      count_pending,
      count_partial,
      count_paid,
    }
  },
}
