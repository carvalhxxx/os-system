import { supabase } from '../lib/supabase'
import { PaymentMethod } from '../types'

export interface OrderPayment {
  id: string
  order_id: string
  user_id: string
  amount: number
  method: PaymentMethod
  paid_at: string
  notes: string | null
  created_at: string
}

export interface OrderPaymentInsert {
  amount: number
  method: PaymentMethod
  paid_at: string
  notes?: string | null
}

export const orderPaymentsService = {
  async getByOrderId(orderId: string): Promise<OrderPayment[]> {
    const { data, error } = await supabase
      .from('order_payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  },

  async add(orderId: string, userId: string, payment: OrderPaymentInsert): Promise<OrderPayment> {
    const { data, error } = await supabase
      .from('order_payments')
      .insert({ ...payment, order_id: orderId, user_id: userId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('order_payments').delete().eq('id', id)
    if (error) throw error
  },
}
