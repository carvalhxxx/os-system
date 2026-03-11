import { supabase } from '../lib/supabase'
import { OrderStatus } from '../types'

export interface MonthlyRevenue {
  month: string      // "Jan", "Fev"...
  month_full: string // "2025-01"
  revenue: number
  orders: number
  labor: number
  parts: number
}

export interface TechnicianPerformance {
  technician_id: string
  name: string
  total_orders: number
  finished_orders: number
  total_revenue: number
  avg_ticket: number
  completion_rate: number
}

export interface StatusDistribution {
  status: OrderStatus
  count: number
  percentage: number
}

export interface TopClient {
  client_id: string
  name: string
  total_orders: number
  total_spent: number
  last_order: string
}

export interface TopPart {
  part_id: string
  name: string
  code: string | null
  total_qty: number
  total_revenue: number
}

export interface ReportFilters {
  date_from: string
  date_to: string
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export const reportsService = {
  // ─── Receita mensal (apenas OS pagas) ───────────────────
  async getMonthlyRevenue(userId: string, filters: ReportFilters): Promise<MonthlyRevenue[]> {
    const { data, error } = await supabase
      .from('service_orders')
      .select('opened_at, service_value, labor_value, parts_total, status, payment_status, amount_paid')
      .eq('user_id', userId)
      .gte('opened_at', filters.date_from)
      .lte('opened_at', filters.date_to)
      .eq('status', 'finalizada')
      .order('opened_at')

    if (error) throw error

    const map = new Map<string, MonthlyRevenue>()
    for (const row of data || []) {
      const date = new Date(row.opened_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = `${MONTH_NAMES[date.getMonth()]}/${String(date.getFullYear()).slice(2)}`

      if (!map.has(key)) {
        map.set(key, { month: label, month_full: key, revenue: 0, orders: 0, labor: 0, parts: 0 })
      }
      const entry = map.get(key)!
      // Receita = valor pago (ou total se estiver pago)
      const paid = row.payment_status === 'pago'
        ? (row.service_value || 0)
        : (row.amount_paid || 0)
      entry.revenue += paid
      entry.labor   += row.labor_value || 0
      entry.parts   += row.parts_total || 0
      entry.orders  += 1
    }

    return Array.from(map.values()).sort((a, b) => a.month_full.localeCompare(b.month_full))
  },

  // ─── Todas as OS no período (para KPIs) ──────────────────
  async getOrdersInPeriod(userId: string, filters: ReportFilters) {
    const { data, error } = await supabase
      .from('service_orders')
      .select('status, service_value, labor_value, parts_total, opened_at, closed_at')
      .eq('user_id', userId)
      .gte('opened_at', filters.date_from)
      .lte('opened_at', filters.date_to)

    if (error) throw error
    return data || []
  },

  // ─── Distribuição por status ──────────────────────────────
  async getStatusDistribution(userId: string, filters: ReportFilters): Promise<StatusDistribution[]> {
    const orders = await reportsService.getOrdersInPeriod(userId, filters)
    const total = orders.length
    if (total === 0) return []

    const counts = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(counts).map(([status, count]) => ({
      status: status as OrderStatus,
      count,
      percentage: Math.round((count / total) * 100),
    })).sort((a, b) => b.count - a.count)
  },

  // ─── Performance por técnico ──────────────────────────────
  async getTechnicianPerformance(userId: string, filters: ReportFilters): Promise<TechnicianPerformance[]> {
    const { data, error } = await supabase
      .from('service_orders')
      .select('technician_id, status, service_value, technician:technicians(id, name)')
      .eq('user_id', userId)
      .gte('opened_at', filters.date_from)
      .lte('opened_at', filters.date_to)
      .not('technician_id', 'is', null)

    if (error) throw error

    const map = new Map<string, TechnicianPerformance>()
    for (const row of data || []) {
      if (!row.technician_id) continue
      const techRaw = row.technician
      const tech = (Array.isArray(techRaw) ? techRaw[0] : techRaw) as { id: string; name: string } | null

      if (!map.has(row.technician_id)) {
        map.set(row.technician_id, {
          technician_id: row.technician_id,
          name: tech?.name || 'Desconhecido',
          total_orders: 0,
          finished_orders: 0,
          total_revenue: 0,
          avg_ticket: 0,
          completion_rate: 0,
        })
      }
      const entry = map.get(row.technician_id)!
      entry.total_orders += 1
      if (row.status === 'finalizada') {
        entry.finished_orders += 1
        entry.total_revenue += row.service_value || 0
      }
    }

    return Array.from(map.values()).map(t => ({
      ...t,
      avg_ticket: t.finished_orders > 0 ? t.total_revenue / t.finished_orders : 0,
      completion_rate: t.total_orders > 0 ? Math.round((t.finished_orders / t.total_orders) * 100) : 0,
    })).sort((a, b) => b.total_revenue - a.total_revenue)
  },

  // ─── Top clientes ─────────────────────────────────────────
  async getTopClients(userId: string, filters: ReportFilters): Promise<TopClient[]> {
    const { data, error } = await supabase
      .from('service_orders')
      .select('client_id, service_value, opened_at, status, client:clients(id, name)')
      .eq('user_id', userId)
      .gte('opened_at', filters.date_from)
      .lte('opened_at', filters.date_to)

    if (error) throw error

    const map = new Map<string, TopClient>()
    for (const row of data || []) {
      if (!row.client_id) continue
      const clientRaw = row.client
      const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { id: string; name: string } | null

      if (!map.has(row.client_id)) {
        map.set(row.client_id, {
          client_id: row.client_id,
          name: client?.name || 'Desconhecido',
          total_orders: 0,
          total_spent: 0,
          last_order: row.opened_at,
        })
      }
      const entry = map.get(row.client_id)!
      entry.total_orders += 1
      if (row.status === 'finalizada') entry.total_spent += row.service_value || 0
      if (row.opened_at > entry.last_order) entry.last_order = row.opened_at
    }

    return Array.from(map.values())
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 10)
  },

  // ─── Peças mais usadas ────────────────────────────────────
  async getTopParts(userId: string, filters: ReportFilters): Promise<TopPart[]> {
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        part_id, quantity, total_price,
        part:parts(id, name, code),
        order:service_orders!inner(user_id, opened_at)
      `)
      .eq('order.user_id', userId)
      .gte('order.opened_at', filters.date_from)
      .lte('order.opened_at', filters.date_to)

    if (error) throw error

    const map = new Map<string, TopPart>()
    for (const row of data || []) {
      if (!row.part_id) continue
      const partRaw = row.part
      const part = (Array.isArray(partRaw) ? partRaw[0] : partRaw) as { id: string; name: string; code: string | null } | null

      if (!map.has(row.part_id)) {
        map.set(row.part_id, {
          part_id: row.part_id,
          name: part?.name || 'Desconhecido',
          code: part?.code || null,
          total_qty: 0,
          total_revenue: 0,
        })
      }
      const entry = map.get(row.part_id)!
      entry.total_qty += row.quantity || 0
      entry.total_revenue += row.total_price || 0
    }

    return Array.from(map.values())
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, 10)
  },

  // ─── Tempo médio de conclusão (dias) ─────────────────────
  async getAvgCompletionDays(userId: string, filters: ReportFilters): Promise<number> {
    const { data, error } = await supabase
      .from('service_orders')
      .select('opened_at, closed_at')
      .eq('user_id', userId)
      .eq('status', 'finalizada')
      .not('closed_at', 'is', null)
      .gte('opened_at', filters.date_from)
      .lte('opened_at', filters.date_to)

    if (error) throw error
    const rows = data || []
    if (rows.length === 0) return 0

    const totalDays = rows.reduce((sum, r) => {
      const diff = new Date(r.closed_at!).getTime() - new Date(r.opened_at).getTime()
      return sum + diff / (1000 * 60 * 60 * 24)
    }, 0)

    return Math.round((totalDays / rows.length) * 10) / 10
  },
}