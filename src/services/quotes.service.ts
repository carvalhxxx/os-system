import { supabase } from '../lib/supabase'
import { generateOrderNumber } from '../lib/utils'

export interface QuoteItem {
  id: string
  quote_id: string
  part_id: string | null
  name: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface Quote {
  id: string
  user_id: string
  client_id: string
  technician_id: string | null
  quote_number: string
  status: 'pendente' | 'aprovado' | 'recusado'
  description: string
  notes: string | null
  labor_value: number
  parts_total: number
  total_value: number
  created_at: string
  updated_at: string
  converted_order_id: string | null
  client?: { name: string; phone?: string; email?: string }
  technician?: { name: string }
  items?: QuoteItem[]
}

export interface QuoteInsert {
  client_id: string
  technician_id?: string | null
  description: string
  notes?: string | null
  labor_value: number
}

export interface QuoteItemInsert {
  part_id?: string | null
  name: string
  quantity: number
  unit_price: number
}

export const quotesService = {
  async list(userId: string): Promise<Quote[]> {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, client:clients(name,phone,email), technician:technicians(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(row => ({
      ...row,
      client: Array.isArray(row.client) ? row.client[0] : row.client,
      technician: Array.isArray(row.technician) ? row.technician[0] : row.technician,
    }))
  },

  async getById(id: string): Promise<Quote> {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, client:clients(name,phone,email), technician:technicians(name), items:quote_items(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return {
      ...data,
      client: Array.isArray(data.client) ? data.client[0] : data.client,
      technician: Array.isArray(data.technician) ? data.technician[0] : data.technician,
      items: data.items || [],
    }
  },

  async create(userId: string, payload: QuoteInsert): Promise<Quote> {
    const { data, error } = await supabase
      .from('quotes')
      .insert({ ...payload, user_id: userId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, payload: Partial<QuoteInsert> & { status?: Quote['status'] }): Promise<void> {
    const { error } = await supabase.from('quotes').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('quotes').delete().eq('id', id)
    if (error) throw error
  },

  // ── Itens ──────────────────────────────────────────────────
  async addItem(quoteId: string, item: QuoteItemInsert): Promise<QuoteItem> {
    const total_price = item.quantity * item.unit_price
    const { data, error } = await supabase
      .from('quote_items')
      .insert({ ...item, quote_id: quoteId, total_price })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateItem(itemId: string, item: Partial<QuoteItemInsert>): Promise<void> {
    const updates: Record<string, unknown> = { ...item }
    if (item.quantity !== undefined && item.unit_price !== undefined) {
      updates.total_price = item.quantity * item.unit_price
    }
    const { error } = await supabase.from('quote_items').update(updates).eq('id', itemId)
    if (error) throw error
  },

  async deleteItem(itemId: string): Promise<void> {
    const { error } = await supabase.from('quote_items').delete().eq('id', itemId)
    if (error) throw error
  },

  // ── Aprovar → converte em OS (atômico via função no banco) ─
  async approve(quoteId: string): Promise<string> {
    const { data, error } = await supabase.rpc('approve_quote', {
      p_quote_id: quoteId,
      p_order_number: generateOrderNumber(),
    })
    if (error) throw error
    return data as string
  },
}