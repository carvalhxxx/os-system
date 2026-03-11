import { supabase } from '../lib/supabase'
import { Client, ClientInsert, ClientUpdate } from '../types'

export const clientsService = {
  async getAll(userId: string, search?: string): Promise<Client[]> {
    let query = supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async create(userId: string, client: ClientInsert): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...client, user_id: userId })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, client: ClientUpdate): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .update({ ...client, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) throw error
  },
}
