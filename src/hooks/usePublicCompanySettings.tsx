import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { CompanySettings } from '../types'

// Busca as configurações da empresa sem autenticação
// usando o VITE_COMPANY_USER_ID definido nas variáveis de ambiente do deploy
const COMPANY_USER_ID = import.meta.env.VITE_COMPANY_USER_ID as string | undefined

export function usePublicCompanySettings() {
  return useQuery({
    queryKey: ['public-company-settings'],
    queryFn: async (): Promise<CompanySettings | null> => {
      if (!COMPANY_USER_ID) return null
      const { data } = await supabase
        .from('company_settings')
        .select('name, logo_url')
        .eq('user_id', COMPANY_USER_ID)
        .maybeSingle()
      return data as CompanySettings | null
    },
    staleTime: 1000 * 60 * 60, // 1 hora — muda raramente
    enabled: !!COMPANY_USER_ID,
  })
}