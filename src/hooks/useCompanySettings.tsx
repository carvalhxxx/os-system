import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { companySettingsService } from '../services/companySettings.service'
import { CompanySettings } from '../types'

const DEFAULT_SETTINGS: Partial<CompanySettings> = {
  name: 'OS Manager',
}

export function useCompanySettings() {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['company-settings', user?.id],
    queryFn: () => companySettingsService.get(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 minutos
  })

  return {
    settings: data ?? DEFAULT_SETTINGS as CompanySettings,
    isLoading,
  }
}
