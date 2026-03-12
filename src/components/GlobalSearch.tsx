import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ClipboardList, Users, Wrench, X, Loader2 } from 'lucide-react'
import { useAuth } from '.././hooks/useAuth'
import { searchService, SearchResult } from '.././services/search.service'
import { STATUS_LABELS, STATUS_COLORS } from '.././lib/utils'
import { OrderStatus } from '.././types'

const TYPE_ICON = {
  order:      ClipboardList,
  client:     Users,
  technician: Wrench,
}

const TYPE_LABEL = {
  order:      'OS',
  client:     'Cliente',
  technician: 'Funcionário',
}

const TYPE_COLOR = {
  order:      'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400',
  client:     'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400',
  technician: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400',
}

export function GlobalSearch() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef  = useRef<HTMLInputElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout>>()

  // Atalho de teclado: "/" foca o campo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (!user || q.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await searchService.search(user.id, q)
      setResults(res)
      setActiveIdx(-1)
    } finally {
      setLoading(false)
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setOpen(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(val), 300)
  }

  const handleSelect = (result: SearchResult) => {
    navigate(result.url)
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSelect(results[activeIdx]) }
  }

  const hasResults = results.length > 0

  return (
    <div className="relative flex-1 max-w-sm">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar OS, cliente, funcionário..."
          className="w-full pl-9 pr-8 py-2 text-sm bg-gray-100 dark:bg-slate-800 border border-transparent focus:border-blue-400 focus:bg-white dark:focus:bg-slate-700 rounded-xl outline-none transition-all text-gray-700 dark:text-slate-200 placeholder-gray-400"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
          {!loading && !query && (
            <kbd className="hidden sm:inline text-xs text-gray-400 bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">/</kbd>
          )}
          {query && !loading && (
            <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }}>
              <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {open && query.length >= 2 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">

            {loading && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
                Buscando...
              </div>
            )}

            {!loading && !hasResults && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                Nenhum resultado para <span className="font-medium text-gray-600 dark:text-slate-300">"{query}"</span>
              </div>
            )}

            {!loading && hasResults && (
              <ul className="py-1.5 max-h-80 overflow-y-auto">
                {results.map((r, idx) => {
                  const Icon = TYPE_ICON[r.type]
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => handleSelect(r)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-left ${
                          idx === activeIdx ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLOR[r.type]}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">
                              {r.title}
                            </span>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${TYPE_COLOR[r.type]}`}>
                              {TYPE_LABEL[r.type]}
                            </span>
                            {r.status && (
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[r.status as OrderStatus]}`}>
                                {STATUS_LABELS[r.status as OrderStatus]}
                              </span>
                            )}
                          </div>
                          {r.subtitle && (
                            <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">
                              {r.subtitle}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex items-center gap-3 text-xs text-gray-400">
              <span><kbd className="font-mono">↑↓</kbd> navegar</span>
              <span><kbd className="font-mono">↵</kbd> abrir</span>
              <span><kbd className="font-mono">Esc</kbd> fechar</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
