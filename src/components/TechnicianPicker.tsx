import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Wrench, Phone, X, ChevronDown } from 'lucide-react'
import { useAuth } from '.././hooks/useAuth'
import { techniciansService } from '.././services/technicians.service'
import { Technician } from '.././types'
import { Modal } from './ui'

interface TechnicianPickerProps {
  value: string
  onChange: (id: string, technician: Technician) => void
  error?: string
}

export function TechnicianPicker({ value, onChange, error }: TechnicianPickerProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ['technicians', user?.id],
    queryFn: () => techniciansService.getAll(user!.id),
    enabled: !!user,
  })

  const filtered = technicians.filter(t =>
    t.active && (
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.specialty || '').toLowerCase().includes(search.toLowerCase()) ||
      t.phone.includes(search)
    )
  )

  const selected = technicians.find(t => t.id === value)

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50)
      setSearch('')
    }
  }, [open])

  const handleSelect = (tech: Technician) => {
    onChange(tech.id, tech)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('', null as any)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`input-field w-full flex items-center justify-between gap-2 text-left ${
          error ? 'border-red-300 dark:border-red-700' : ''
        }`}
      >
        {selected ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
              <Wrench className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                {selected.name}
              </p>
              {selected.specialty && (
                <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
                  {selected.specialty}
                </p>
              )}
            </div>
          </div>
        ) : (
          <span className="text-gray-400 dark:text-slate-500 text-sm">
            Selecione um técnico...
          </span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {selected && (
            <span onClick={handleClear} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700">
              <X className="w-3 h-3 text-gray-400" />
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Selecionar Técnico" size="md">
        <div className="space-y-3">

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, especialidade ou telefone..."
              className="input-field pl-9"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto -mx-6 px-6 space-y-1">
            {isLoading && (
              <div className="py-8 text-center text-sm text-gray-400">Buscando...</div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="py-8 text-center">
                <Wrench className="w-8 h-8 text-gray-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  {search ? `Nenhum técnico encontrado para "${search}"` : 'Nenhum técnico ativo cadastrado'}
                </p>
              </div>
            )}

            {filtered.map(tech => {
              const isSelected = tech.id === value
              return (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => handleSelect(tech)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm ${
                    isSelected
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                  }`}>
                    {tech.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${
                      isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-800 dark:text-slate-200'
                    }`}>
                      {tech.name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {tech.specialty && (
                        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                          <Wrench className="w-3 h-3" />
                          {tech.specialty}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                        <Phone className="w-3 h-3" />
                        {tech.phone}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
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
      </Modal>
    </>
  )
}
