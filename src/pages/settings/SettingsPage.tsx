import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Phone, MapPin, FileText, Save, ImagePlus, Trash2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { companySettingsService } from '../../services/companySettings.service'
import { supabase } from '../../lib/supabase'
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
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

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
      setLogoUrl(settings.logo_url ?? null)
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
      logo_url: logoUrl,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-settings'] })
      toast.success('Configurações salvas!')
    },
    onError: () => toast.error('Erro ao salvar configurações'),
  })

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingLogo(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `logos/${user.id}.${ext}`
      const { error } = await supabase.storage
        .from('attachments')
        .upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('attachments').getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()
      setLogoUrl(url)
      await companySettingsService.upsert(user.id, {
        name: settings?.name || 'Minha Assistência',
        phone: settings?.phone || null,
        email: settings?.email || null,
        document: settings?.document || null,
        address: settings?.address || null,
        city: settings?.city || null,
        state: settings?.state || null,
        zip_code: settings?.zip_code || null,
        website: settings?.website || null,
        logo_url: url,
      })
      qc.invalidateQueries({ queryKey: ['company-settings'] })
      toast.success('Logo atualizada!')
    } catch {
      toast.error('Erro ao fazer upload da logo')
    } finally {
      setUploadingLogo(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleLogoRemove() {
    if (!user) return
    setLogoUrl(null)
    await companySettingsService.upsert(user.id, {
      name: settings?.name || 'Minha Assistência',
      phone: settings?.phone || null,
      email: settings?.email || null,
      document: settings?.document || null,
      address: settings?.address || null,
      city: settings?.city || null,
      state: settings?.state || null,
      zip_code: settings?.zip_code || null,
      website: settings?.website || null,
      logo_url: null,
    })
    qc.invalidateQueries({ queryKey: ['company-settings'] })
    toast.success('Logo removida!')
  }

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

          {/* Logo */}
          <div>
            <label className="label">Logo da Empresa</label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative group">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-20 h-20 object-contain rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-2"
                  />
                  <button
                    type="button"
                    onClick={handleLogoRemove}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center bg-gray-50 dark:bg-slate-800">
                  <ImagePlus className="w-7 h-7 text-gray-300 dark:text-slate-600" />
                </div>
              )}
              <div className="space-y-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingLogo}
                  className="btn-secondary text-sm"
                >
                  <ImagePlus className="w-4 h-4" />
                  {uploadingLogo ? 'Enviando...' : logoUrl ? 'Trocar logo' : 'Enviar logo'}
                </button>
                <p className="text-xs text-gray-400 dark:text-slate-500">PNG, JPG ou SVG. Recomendado: 200×200px</p>
              </div>
            </div>
          </div>

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