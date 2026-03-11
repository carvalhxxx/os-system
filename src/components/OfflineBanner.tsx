import { WifiOff, Clock } from 'lucide-react'
import { useOnlineStatus } from '.././hooks/useOnlineStatus'

function formatLastOnline(date: Date | null): string {
  if (!date) return ''
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return `há ${diff}s`
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`
  return `há ${Math.floor(diff / 3600)}h`
}

export function OfflineBanner() {
  const { state, lastOnline } = useOnlineStatus()

  if (state === 'online') return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 dark:bg-red-700">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-white text-sm">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span className="font-medium">Sem conexão com a internet</span>
          <span className="text-red-200 text-xs hidden sm:inline">
            — Os dados exibidos são da última sessão e podem estar desatualizados.
          </span>
        </div>

        {lastOnline && (
          <span className="text-xs text-white/70 hidden md:flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3" />
            Online {formatLastOnline(lastOnline)}
          </span>
        )}
      </div>
    </div>
  )
}
