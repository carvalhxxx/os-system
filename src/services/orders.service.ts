import { supabase } from '../lib/supabase'
import {
  ServiceOrder,
  ServiceOrderInsert,
  ServiceOrderUpdate,
  OrderFilters,
  DashboardStats,
  OrderStatus,
} from '../types'
import { generateOrderNumber } from '../lib/utils'

export const ordersService = {
  async getAll(userId: string, filters?: OrderFilters): Promise<ServiceOrder[]> {
    let query = supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(id, name, phone, document),
        technician:technicians(id, name, specialty)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.client_id) query = query.eq('client_id', filters.client_id)
    if (filters?.date_from) query = query.gte('opened_at', filters.date_from)
    if (filters?.date_to) query = query.lte('opened_at', filters.date_to)
    if (filters?.search) {
      query = query.or(`order_number.ilike.%${filters.search}%,problem_description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as ServiceOrder[]
  },

  async getById(id: string): Promise<ServiceOrder> {
    const { data, error } = await supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(*),
        technician:technicians(*),
        attachments(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as ServiceOrder
  },

  async create(userId: string, order: ServiceOrderInsert): Promise<ServiceOrder> {
    const { data, error } = await supabase
      .from('service_orders')
      .insert({
        ...order,
        user_id: userId,
        order_number: generateOrderNumber(),
      })
      .select(`*, client:clients(id, name), technician:technicians(id, name)`)
      .single()

    if (error) throw error
    return data as ServiceOrder
  },

  async update(id: string, order: ServiceOrderUpdate): Promise<ServiceOrder> {
    const { data: current } = await supabase
      .from('service_orders').select('status').eq('id', id).single()

    if (current?.status === 'finalizada' || current?.status === 'cancelada')
      throw new Error('Esta OS está finalizada e não pode ser editada.')

    const updateData: ServiceOrderUpdate & { updated_at: string; closed_at?: string | null } = {
      ...order,
      updated_at: new Date().toISOString(),
    }

    if (order.status === 'finalizada' || order.status === 'cancelada') {
      updateData.closed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('service_orders')
      .update(updateData)
      .eq('id', id)
      .select(`*, client:clients(id, name), technician:technicians(id, name)`)
      .single()

    if (error) throw error
    return data as ServiceOrder
  },

  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    const { data: current } = await supabase
      .from('service_orders').select('status').eq('id', id).single()

    if (current?.status === 'finalizada' || current?.status === 'cancelada')
      throw new Error('Esta OS está finalizada e não pode ser alterada.')

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'finalizada' || status === 'cancelada') {
      updateData.closed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('service_orders')
      .update(updateData)
      .eq('id', id)

    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { data: current } = await supabase
      .from('service_orders').select('status').eq('id', id).single()

    if (current?.status === 'finalizada' || current?.status === 'cancelada')
      throw new Error('Esta OS está finalizada e não pode ser excluída.')

    const { error } = await supabase.from('service_orders').delete().eq('id', id)
    if (error) throw error
  },

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const { data, error } = await supabase
      .from('service_orders')
      .select('status, service_value, payment_status, amount_paid')
      .eq('user_id', userId)

    if (error) throw error

    const orders = data || []
    const finished = orders.filter(o => o.status === 'finalizada')

    const total_revenue = finished
      .filter(o => o.payment_status === 'pago')
      .reduce((sum, o) => sum + (o.service_value || 0), 0)

    const total_receivable = finished
      .filter(o => o.payment_status !== 'pago')
      .reduce((sum, o) => {
        const remaining = (o.service_value || 0) - (o.amount_paid || 0)
        return sum + remaining
      }, 0)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    return {
      total_open:       orders.filter(o => o.status === 'aberta').length,
      total_in_progress:orders.filter(o => o.status === 'em_andamento' || o.status === 'aguardando_peca').length,
      total_finished:   finished.length,
      total_revenue,
      total_receivable,
    }
  },

  async getRecent(userId: string, limit = 10): Promise<ServiceOrder[]> {
    const { data, error } = await supabase
      .from('service_orders')
      .select(`*, client:clients(id, name), technician:technicians(id, name)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data || []) as ServiceOrder[]
  },
}
