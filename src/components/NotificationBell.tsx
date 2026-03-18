import { useState, useEffect, useRef } from 'react'
import { Bell, AlertTriangle, Clock, CheckCircle, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import {  localDateString } from '../lib/utils'

interface Notification {
  id: string
  order_id: string
  order_number: string
  client_name: string
  type: 'overdue' | 'stale' | 'awaiting'
  days: number
  read: boolean
}

async function fetchNotifications(userId: string): Promise<Notification[]> {
  const today = localDateString()
  const staleDate = (() => { const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()

  const { data, error } = await supabase
    .from('service_orders')
    .select('id, order_number, opened_at, closed_at, status, clients(name)')
    .eq('user_id', userId)
    .in('status', ['aberta', 'em_andamento', 'aguardando_peca'])
    .order('opened_at')

  if (error) throw error

  const notifs: Notification[] = []

  for (const row of data || []) {
    const raw = row.clients
    const clientName = (Array.isArray(raw) ? raw[0] : raw)?.name || 'Cliente'
    const openedAt = row.opened_at?.split('T')[0] || ''
    const closedAt = row.closed_at?.split('T')[0] || ''
    const daysSinceOpen = Math.floor((Date.now() - new Date(openedAt).getTime()) / 86400000)

    // OS com prazo vencido (closed_at no passado)
    if (closedAt && closedAt < today) {
      const daysOverdue = Math.floor((Date.now() - new Date(closedAt).getTime()) / 86400000)
      notifs.push({
        id: `overdue-${row.id}`,
        order_id: row.id,
        order_number: row.order_number,
        client_name: clientName,
        type: 'overdue',
        days: daysOverdue,
        read: false,
      })
      continue
    }

    // OS aguardando peça há mais de 3 dias
    if (row.status === 'aguardando_peca' && daysSinceOpen >= 3) {
      notifs.push({
        id: `awaiting-${row.id}`,
        order_id: row.id,
        order_number: row.order_number,
        client_name: clientName,
        type: 'awaiting',
        days: daysSinceOpen,
        read: false,
      })
      continue
    }

    // OS abertas/em andamento há mais de 7 dias
    if (openedAt <= staleDate) {
      notifs.push({
        id: `stale-${row.id}`,
        order_id: row.id,
        order_number: row.order_number,
        client_name: clientName,
        type: 'stale',
        days: daysSinceOpen,
        read: false,
      })
    }
  }

  return notifs
}

const READ_KEY = 'notif_read_ids'
function getReadIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')) } catch { return new Set() }
}
function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]))
}

export function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(getReadIds)
  const ref = useRef<HTMLDivElement>(null)

  const { data: all = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => fetchNotifications(user!.id),
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // atualiza a cada 5 min
  })

  const notifications = all.map(n => ({ ...n, read: readIds.has(n.id) }))
  const unread = notifications.filter(n => !n.read).length

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function markAllRead() {
    const newIds = new Set([...readIds, ...all.map(n => n.id)])
    setReadIds(newIds)
    saveReadIds(newIds)
  }

  function handleClick(n: Notification) {
    const newIds = new Set([...readIds, n.id])
    setReadIds(newIds)
    saveReadIds(newIds)
    setOpen(false)
    navigate(`/ordens/${n.order_id}`)
  }

  const iconMap = {
    overdue:  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />,
    stale:    <Clock className="w-4 h-4 text-yellow-500 shrink-0" />,
    awaiting: <Clock className="w-4 h-4 text-purple-500 shrink-0" />,
  }

  const labelMap = {
    overdue:  (days: number) => `Prazo vencido há ${days}d`,
    stale:    (days: number) => `Aberta há ${days} dias`,
    awaiting: (days: number) => `Aguardando peça há ${days}d`,
  }

  const colorMap = {
    overdue:  'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/40',
    stale:    'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800/40',
    awaiting: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/40',
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 transition-colors relative"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">
              Notificações {unread > 0 && <span className="ml-1 text-xs text-red-500">({unread} nova{unread !== 1 ? 's' : ''})</span>}
            </span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <p className="text-sm text-gray-500 dark:text-slate-400">Tudo em dia!</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">Nenhuma OS com pendência</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b last:border-0 border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${
                    n.read ? 'opacity-60' : ''
                  }`}
                >
                  {iconMap[n.type]}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{n.order_number}</span>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{n.client_name}</p>
                    <p className={`text-xs font-medium mt-0.5 ${
                      n.type === 'overdue' ? 'text-red-600 dark:text-red-400'
                      : n.type === 'awaiting' ? 'text-purple-600 dark:text-purple-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {labelMap[n.type](n.days)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}