import { supabase } from '../lib/supabase'
import { Technician, ServiceOrder } from '../types'

export interface TechnicianHistory {
  technician: Technician
  orders: ServiceOrder[]
  stats: {
    total_orders: number
    finished_orders: number
    cancelled_orders: number
    in_progress_orders: number
    total_revenue: number        // soma das OS pagas que atendeu
    avg_ticket: number
    first_order: string | null
    last_order: string | null
    avg_completion_days: number  // média de dias para concluir
  }
}

export const technicianHistoryService = {
  async getTechnicianHistory(technicianId: string): Promise<TechnicianHistory> {
    const { data: technician, error: techError } = await supabase
      .from('technicians')
      .select('*')
      .eq('id', technicianId)
      .single()

    if (techError) throw techError

    const { data: orders, error: ordersError } = await supabase
      .from('service_orders')
      .select(`*, client:clients(id, name, phone)`)
      .eq('technician_id', technicianId)
      .order('opened_at', { ascending: false })

    if (ordersError) throw ordersError

    const list = (orders || []) as ServiceOrder[]

    const finished   = list.filter(o => o.status === 'finalizada')
    const cancelled  = list.filter(o => o.status === 'cancelada')
    const inProgress = list.filter(o => o.status === 'em_andamento' || o.status === 'aguardando_peca')
    const paid       = finished.filter(o => o.payment_status === 'pago')
    const totalRevenue = paid.reduce((s, o) => s + (o.service_value || 0), 0)

    // Média de dias para concluir (aberta → fechada)
    const completionDays = finished
      .filter(o => o.opened_at && o.closed_at)
      .map(o => {
        const diff = new Date(o.closed_at!).getTime() - new Date(o.opened_at).getTime()
        return diff / (1000 * 60 * 60 * 24)
      })

    const avgCompletionDays = completionDays.length > 0
      ? completionDays.reduce((a, b) => a + b, 0) / completionDays.length
      : 0

    const dates = list.map(o => o.opened_at).sort()

    return {
      technician: technician as Technician,
      orders: list,
      stats: {
        total_orders:        list.length,
        finished_orders:     finished.length,
        cancelled_orders:    cancelled.length,
        in_progress_orders:  inProgress.length,
        total_revenue:       totalRevenue,
        avg_ticket:          paid.length > 0 ? totalRevenue / paid.length : 0,
        first_order:         dates[0] || null,
        last_order:          dates[dates.length - 1] || null,
        avg_completion_days: avgCompletionDays,
      },
    }
  },
}
