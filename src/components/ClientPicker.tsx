import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, User, Phone, FileText, X, ChevronDown, Plus, ArrowLeft } from 'lucide-react'
import { useAuth } from '.././hooks/useAuth'
import { clientsService } from '.././services/clients.service'
import { Client } from '.././types'
import { Modal } from './ui'
import { maskPhone, maskDocument } from '.././lib/utils'
import toast from 'react-hot-toast'

interface ClientPickerProps {
  value: string
  onChange: (id: string, client: Client) => void
  error?: string
}

export function ClientPicker({ value, onChange, error }: ClientPickerProps) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const [mode, setMode]       = useState<'list' | 'new'>('list')
  const searchRef             = useRef<HTMLInputElement>(null)
  const nameRef               = useRef<HTMLInputElement>(null)

  const [newName, setNewName]         = useState('')
  const [newPhone, setNewPhone]       = useState('')
  const [newDocument, setNewDocument] = useState('')

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', user?.id, search],
    queryFn: () => clientsService.getAll(user!.id, search || undefined),
    enabled: !!user && open,
  })

  const { data: allClients = [] } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: () => clientsService.getAll(user!.id),
    enabled: !!user,
  })

  const selected = allClients.find(c => c.id === value)

  useEffect(() => {
    if (open) {
      setMode('list')
      setSearch('')
      setNewName(''); setNewPhone(''); setNewDocument('')
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (mode === 'new') setTimeout(() => nameRef.current?.focus(), 50)
  }, [mode])

  const createMutation = useMutation({
    mutationFn: (data: { name: string; phone: string; document: string }) =>
      clientsService.create(user!.id, {
        name: data.name, phone: data.phone, document: data.document,
        email: null, address: null, city: null, state: null, zip_code: null, notes: null,
      }),
    onSuccess: (client) => {
      qc.invalidateQueries({ queryKey: ['clients', user?.id] })
      onChange(client.id, client)
      setOpen(false)
      toast.success(`Cliente ${client.name} criado e selecionado!`)
    },
    onError: () => toast.error('Erro ao cadastrar cliente'),
  })

  const handleSelect = (client: Client) => { onChange(client.id, client); setOpen(false) }

  const handleCreate = () => {
    if (!newName.trim()) return toast.error('Nome obrigatório')
    if (!newPhone.trim()) return toast.error('Telefone obrigatório')
    if (!newDocument.trim()) return toast.error('CPF/CNPJ obrigatório')
    createMutation.mutate({ name: newName.trim(), phone: newPhone, document: newDocument })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`input-field w-full flex items-center justify-between gap-2 text-left ${error ? 'border-red-300 dark:border-red-700' : ''}`}
      >
        {selected ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
              <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{selected.name}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{selected.phone}</p>
            </div>
          </div>
        ) : (
          <span className="text-gray-400 dark:text-slate-500 text-sm">Selecione um cliente...</span>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={mode === 'list' ? 'Selecionar Cliente' : 'Novo Cliente'} size="md">
        {mode === 'list' ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nome, telefone ou CPF..." className="input-field pl-9" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              <button type="button" onClick={() => setMode('new')} className="btn-primary shrink-0 text-sm" title="Cadastrar novo cliente">
                <Plus className="w-4 h-4" /> Novo
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto -mx-6 px-6 space-y-1">
              {isLoading && <div className="py-8 text-center text-sm text-gray-400">Buscando...</div>}

              {!isLoading && clients.length === 0 && (
                <div className="py-8 text-center">
                  <User className="w-8 h-8 text-gray-200 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 mb-3">
                    {search ? `Nenhum cliente encontrado para "${search}"` : 'Nenhum cliente cadastrado'}
                  </p>
                  <button type="button" onClick={() => setMode('new')} className="text-sm text-blue-600 hover:underline">
                    Cadastrar novo cliente
                  </button>
                </div>
              )}

              {clients.map(client => {
                const isSelected = client.id === value
                return (
                  <button key={client.id} type="button" onClick={() => handleSelect(client)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                    }`}>
                      {client.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-slate-200'}`}>
                        {client.name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                          <Phone className="w-3 h-3" />{client.phone}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 font-mono">
                          <FileText className="w-3 h-3" />{client.document}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button type="button" onClick={() => setMode('list')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar para a lista
            </button>

            <div>
              <label className="label">Nome *</label>
              <input ref={nameRef} type="text" value={newName} onChange={e => setNewName(e.target.value)}
                className="input-field" placeholder="Nome completo do cliente" />
            </div>

            <div>
              <label className="label">Telefone / WhatsApp *</label>
              <input type="text" value={newPhone} onChange={e => setNewPhone(maskPhone(e.target.value))}
                className="input-field" placeholder="(11) 99999-9999" />
            </div>

            <div>
              <label className="label">CPF / CNPJ *</label>
              <input type="text" value={newDocument} onChange={e => setNewDocument(maskDocument(e.target.value))}
                className="input-field" placeholder="000.000.000-00" />
            </div>

            <p className="text-xs text-gray-400 dark:text-slate-500">
              Dados adicionais podem ser completados depois na página do cliente.
            </p>

            <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-slate-700">
              <button type="button" className="btn-secondary" onClick={() => setMode('list')}>Cancelar</button>
              <button type="button" className="btn-primary" disabled={createMutation.isPending} onClick={handleCreate}>
                <Plus className="w-4 h-4" />
                {createMutation.isPending ? 'Cadastrando...' : 'Cadastrar e Selecionar'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}