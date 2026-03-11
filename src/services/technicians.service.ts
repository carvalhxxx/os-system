import { supabase } from '../lib/supabase'
import { Technician, TechnicianInsert, TechnicianUpdate } from '../types'

export const techniciansService = {
  async getAll(userId: string): Promise<Technician[]> {
    const { data, error } = await supabase
      .from('technicians')
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (error) throw error
    return data || []
  },

  async getActive(userId: string): Promise<Technician[]> {
    const { data, error } = await supabase
      .from('technicians')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('name')

    if (error) throw error
    return data || []
  },

  async create(userId: string, tech: TechnicianInsert): Promise<Technician> {
    const { data, error } = await supabase
      .from('technicians')
      .insert({ ...tech, user_id: userId })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, tech: TechnicianUpdate): Promise<Technician> {
    const { data, error } = await supabase
      .from('technicians')
      .update({ ...tech, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('technicians').delete().eq('id', id)
    if (error) throw error
  },
}
