import { supabase } from '../lib/supabase'
import { ServiceOrder } from '../types'

export interface PublicOrderData {
  order_number: string
  status: ServiceOrder['status']
  problem_description: string
  diagnosis: string | null
  service_performed: string | null
  service_value: number
  labor_value: number
  opened_at: string
  closed_at: string | null
  notes: string | null
  client: {
    name: string
    phone: string
  }
  technician: {
    name: string
    specialty: string | null
  } | null
}

export const portalService = {
  async getByToken(token: string): Promise<PublicOrderData> {
    const { data, error } = await supabase
      .from('service_orders')
      .select(`
        order_number,
        status,
        problem_description,
        diagnosis,
        service_performed,
        service_value,
        labor_value,
        opened_at,
        closed_at,
        notes,
        client:clients(name, phone),
        technician:technicians(name, specialty)
      `)
      .eq('public_token', token)
      .single()

    if (error) throw error
    if (!data) throw new Error('OS não encontrada')

    return data as unknown as PublicOrderData
  },

  // Busca o token de uma OS (para montar o link)
  async getTokenByOrderId(orderId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('service_orders')
      .select('public_token')
      .eq('id', orderId)
      .single()

    if (error) throw error
    return data?.public_token ?? null
  },
}
