import { supabase } from '../lib/supabase'

export interface OrderNote {
  id: string
  order_id: string
  user_id: string
  author: string
  content: string
  created_at: string
  updated_at: string
}

export const orderNotesService = {
  async getByOrderId(orderId: string): Promise<OrderNote[]> {
    const { data, error } = await supabase
      .from('order_notes')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  },

  async create(orderId: string, userId: string, author: string, content: string): Promise<OrderNote> {
    const { data, error } = await supabase
      .from('order_notes')
      .insert({ order_id: orderId, user_id: userId, author, content })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('order_notes')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('order_notes')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
