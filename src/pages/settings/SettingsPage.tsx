import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Phone,  MapPin, FileText, Save } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { companySettingsService } from '../../services/companySettings.service'
import { FormField, PageLoader } from '../../components/ui'
import toast from 'react-hot-toast'

const schema = z.object({
  name:     z.string().min(2, 'Nome obrigatório'),
  phone:    z.string().optional(),
  email:    z.string().email('Email inválido').or(z.literal('')).optional(),
  document: z.string().optional(),
  address:  z.string().optional(),
  city:     z.string().optional(),
  state:    z.string().optional(),
  zip_code: z.string().optional(),
  website:  z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function SettingsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings', user?.id],
    queryFn: () => companySettingsService.get(user!.id),
    enabled: !!user,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: 'Minha Assistência' },
  })

  useEffect(() => {
    if (settings) {
      reset({
        name:     settings.name,
        phone:    settings.phone    ?? '',
        email:    settings.email    ?? '',
        document: settings.document ?? '',
        address:  settings.address  ?? '',
        city:     settings.city     ?? '',
        state:    settings.state    ?? '',
        zip_code: settings.zip_code ?? '',
        website:  settings.website  ?? '',
      })
    }
  }, [settings, reset])

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => companySettingsService.upsert(user!.id, {
      name:     data.name,
      phone:    data.phone    || null,
      email:    data.email    || null,
      document: data.document || null,
      address:  data.address  || null,
      city:     data.city     || null,
      state:    data.state    || null,
      zip_code: data.zip_code || null,
      website:  data.website  || null,
      logo_url: settings?.logo_url ?? null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-settings'] })
      toast.success('Configurações salvas!')
    },
    onError: () => toast.error('Erro ao salvar configurações'),
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Dados da sua empresa — aparecem no PDF e no portal do cliente
        </p>
      </div>

      <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-5">

        {/* Identidade */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
              Identificação
            </h2>
          </div>

          <FormField label="Nome da Empresa" error={errors.name?.message} required>
            <input {...register('name')} className="input-field" placeholder="Ex: TechFix Assistência Técnica" />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="CNPJ / CPF" error={errors.document?.message}>
              <input {...register('document')} className="input-field" placeholder="00.000.000/0001-00" />
            </FormField>
            <FormField label="Site" error={errors.website?.message}>
              <input {...register('website')} className="input-field" placeholder="www.suaempresa.com.br" />
            </FormField>
          </div>
        </div>

        {/* Contato */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
              Contato
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Telefone / WhatsApp" error={errors.phone?.message}>
              <input {...register('phone')} className="input-field" placeholder="(11) 99999-9999" />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" className="input-field" placeholder="contato@empresa.com.br" />
            </FormField>
          </div>
        </div>

        {/* Endereço */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
              Endereço
            </h2>
          </div>

          <FormField label="Endereço" error={errors.address?.message}>
            <input {...register('address')} className="input-field" placeholder="Rua, número, bairro" />
          </FormField>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <FormField label="Cidade" error={errors.city?.message}>
                <input {...register('city')} className="input-field" />
              </FormField>
            </div>
            <FormField label="Estado" error={errors.state?.message}>
              <input {...register('state')} className="input-field" maxLength={2} placeholder="SP" />
            </FormField>
            <FormField label="CEP" error={errors.zip_code?.message}>
              <input {...register('zip_code')} className="input-field" placeholder="00000-000" />
            </FormField>
          </div>
        </div>

        {/* Preview como aparece no PDF */}
        <div className="card p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
              Preview — como aparece no cabeçalho do PDF
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-blue-100 dark:border-slate-700">
            <p className="font-bold text-gray-900 dark:text-white text-sm">
              {settings?.name || 'Nome da Empresa'}
            </p>
            {(settings?.phone || settings?.email) && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {[settings.phone, settings.email].filter(Boolean).join(' · ')}
              </p>
            )}
            {(settings?.address || settings?.city) && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {[settings.address, settings.city, settings.state].filter(Boolean).join(', ')}
              </p>
            )}
            {settings?.document && (
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                CNPJ: {settings.document}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="btn-primary"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>
    </div>
  )
}
