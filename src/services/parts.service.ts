import { supabase } from '../lib/supabase'
import { Part, PartInsert, PartUpdate } from '../types'

export const partsService = {
  async getAll(userId: string, search?: string): Promise<Part[]> {
    let query = supabase
      .from('parts')
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Part> {
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(userId: string, part: PartInsert): Promise<Part> {
    const { data, error } = await supabase
      .from('parts')
      .insert({ ...part, user_id: userId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, part: PartUpdate): Promise<Part> {
    const { data, error } = await supabase
      .from('parts')
      .update({ ...part, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('parts').delete().eq('id', id)
    if (error) throw error
  },
}
