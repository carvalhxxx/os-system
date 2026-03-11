import { QueryClient } from '@tanstack/react-query'

const CACHE_KEY = 'os-manager-query-cache'
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 // 24 horas

interface PersistedCache {
  timestamp: number
  queries: Array<{
    queryKey: unknown[]
    data: unknown
    dataUpdatedAt: number
  }>
}

// ─── Salva o cache atual no localStorage ─────────────────────────────────────
export function persistCache(queryClient: QueryClient): void {
  try {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()
      .filter(q => q.state.status === 'success' && q.state.data !== undefined)
      .map(q => ({
        queryKey: q.queryKey as unknown[],
        data: q.state.data,
        dataUpdatedAt: q.state.dataUpdatedAt,
      }))

    const persisted: PersistedCache = {
      timestamp: Date.now(),
      queries,
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(persisted))
  } catch {
    // localStorage cheio ou indisponível — ignora silenciosamente
  }
}

// ─── Restaura o cache do localStorage para o QueryClient ─────────────────────
export function restoreCache(queryClient: QueryClient): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return

    const persisted: PersistedCache = JSON.parse(raw)

    // Ignora cache muito antigo
    if (Date.now() - persisted.timestamp > CACHE_MAX_AGE) {
      localStorage.removeItem(CACHE_KEY)
      return
    }

    for (const entry of persisted.queries) {
      // Só restaura se a query ainda não tem dados em memória
      const existing = queryClient.getQueryData(entry.queryKey)
      if (existing === undefined) {
        queryClient.setQueryData(entry.queryKey, entry.data)
      }
    }
  } catch {
    // Cache corrompido — limpa
    localStorage.removeItem(CACHE_KEY)
  }
}

// ─── Limpa o cache persistido (ex: ao fazer logout) ──────────────────────────
export function clearPersistedCache(): void {
  localStorage.removeItem(CACHE_KEY)
}
