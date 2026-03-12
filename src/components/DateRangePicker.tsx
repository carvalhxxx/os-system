import { useState } from 'react'
import { CalendarDays, X, ChevronDown } from 'lucide-react'
import { Modal } from './ui'
import { formatDate } from '../lib/utils'

interface DateRangePickerProps {
  from: string
  to: string
  onFromChange: (val: string) => void
  onToChange: (val: string) => void
}

export function DateRangePicker({ from, to, onFromChange, onToChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  const hasValue = from || to

  const label = hasValue
    ? [from && formatDate(from), to && formatDate(to)].filter(Boolean).join(' → ')
    : 'Filtrar por data'

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFromChange('')
    onToChange('')
  }

  return (
    <>
      {/* Botão que abre o modal — visível em todos os tamanhos */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`input-field w-full flex items-center justify-between gap-2 text-left ${
          hasValue ? 'border-blue-400 dark:border-blue-600' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
          <span className={`text-sm truncate ${hasValue ? 'text-gray-800 dark:text-slate-200' : 'text-gray-400 dark:text-slate-500'}`}>
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasValue && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700"
            >
              <X className="w-3 h-3 text-gray-400" />
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </button>

      {/* Modal com os campos de data */}
      <Modal open={open} onClose={() => setOpen(false)} title="Filtrar por Período" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Data inicial
            </label>
            <input
              type="date"
              value={from}
              onChange={e => onFromChange(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Data final
            </label>
            <input
              type="date"
              value={to}
              onChange={e => onToChange(e.target.value)}
              className="input-field w-full"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
            <button
              type="button"
              onClick={handleClear}
              className="btn-secondary flex-1"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-primary flex-1"
            >
              Aplicar
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
