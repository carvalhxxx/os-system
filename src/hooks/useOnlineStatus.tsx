import { useState, useEffect } from 'react'

export type ConnectionState = 'online' | 'offline'

export function useOnlineStatus() {
  const [state, setState] = useState<ConnectionState>(
    navigator.onLine ? 'online' : 'offline'
  )
  const [lastOnline, setLastOnline] = useState<Date | null>(
    navigator.onLine ? new Date() : null
  )

  useEffect(() => {
    const handleOnline = () => {
      setState('online')
      setLastOnline(new Date())
    }
    const handleOffline = () => setState('offline')

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { state, lastOnline }
}

