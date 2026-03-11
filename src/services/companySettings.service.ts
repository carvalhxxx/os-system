import { supabase } from '../lib/supabase'
import { CompanySettings, CompanySettingsUpsert } from '../types'

export const companySettingsService = {
  async get(userId: string): Promise<CompanySettings | null> {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data as CompanySettings | null
  },

  async upsert(userId: string, settings: CompanySettingsUpsert): Promise<CompanySettings> {
    const { data, error } = await supabase
      .from('company_settings')
      .upsert({ ...settings, user_id: userId }, { onConflict: 'user_id' })
      .select('*')
      .single()

    if (error) throw error
    return data as CompanySettings
  },
}
