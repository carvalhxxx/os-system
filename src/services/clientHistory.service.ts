import { supabase } from '../lib/supabase'
import { Client, ServiceOrder } from '../types'

export interface ClientHistory {
  client: Client
  orders: ServiceOrder[]
  stats: {
    total_orders: number
    finished_orders: number
    cancelled_orders: number
    total_spent: number        // OS pagas
    total_pending: number      // OS a receber
    first_order: string | null
    last_order: string | null
    avg_ticket: number
  }
}

export const clientHistoryService = {
  async getClientHistory(clientId: string): Promise<ClientHistory> {
    // Busca cliente
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError) throw clientError

    // Busca todas as OS do cliente com detalhes
    const { data: orders, error: ordersError } = await supabase
      .from('service_orders')
      .select(`
        *,
        technician:technicians(id, name)
      `)
      .eq('client_id', clientId)
      .order('opened_at', { ascending: false })

    if (ordersError) throw ordersError

    const list = (orders || []) as ServiceOrder[]

    const finished   = list.filter(o => o.status === 'finalizada')
    const cancelled  = list.filter(o => o.status === 'cancelada')
    const paid       = finished.filter(o => o.payment_status === 'pago')
    const pending    = finished.filter(o => o.payment_status !== 'pago')
    const totalSpent = paid.reduce((s, o) => s + (o.service_value || 0), 0)
    const totalPending = pending.reduce((s, o) => {
      const remaining = (o.service_value || 0) - (o.amount_paid || 0)
      return s + remaining
    }, 0)

    const dates = list.map(o => o.opened_at).sort()

    return {
      client: client as Client,
      orders: list,
      stats: {
        total_orders:     list.length,
        finished_orders:  finished.length,
        cancelled_orders: cancelled.length,
        total_spent:      totalSpent,
        total_pending:    totalPending,
        first_order:      dates[0] || null,
        last_order:       dates[dates.length - 1] || null,
        avg_ticket:       paid.length > 0 ? totalSpent / paid.length : 0,
      },
    }
  },
}
