import { supabase } from '../lib/supabase'

export interface SearchResult {
  type: 'order' | 'client' | 'technician'
  id: string
  title: string
  subtitle: string
  url: string
  status?: string
}

export const searchService = {
  async search(userId: string, query: string): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) return []

    const q = query.trim()

    const [orders, clients, technicians] = await Promise.all([
      // OS: busca por número ou descrição do problema
      supabase
        .from('service_orders')
        .select('id, order_number, problem_description, status, client:clients(name)')
        .eq('user_id', userId)
        .or(`order_number.ilike.%${q}%,problem_description.ilike.%${q}%`)
        .limit(5),

      // Clientes: busca por nome, telefone ou documento
      supabase
        .from('clients')
        .select('id, name, phone, document')
        .eq('user_id', userId)
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%,document.ilike.%${q}%`)
        .limit(5),

      // Técnicos: busca por nome ou especialidade
      supabase
        .from('technicians')
        .select('id, name, specialty, phone')
        .eq('user_id', userId)
        .or(`name.ilike.%${q}%,specialty.ilike.%${q}%`)
        .limit(3),
    ])

    const results: SearchResult[] = []

    for (const o of orders.data || []) {
      results.push({
        type:     'order',
        id:       o.id,
        title:    o.order_number,
        subtitle: (o.client as any)?.name
          ? `${(o.client as any).name} — ${o.problem_description?.slice(0, 60)}`
          : o.problem_description?.slice(0, 80) || '',
        url:      `/ordens/${o.id}`,
        status:   o.status,
      })
    }

    for (const c of clients.data || []) {
      results.push({
        type:     'client',
        id:       c.id,
        title:    c.name,
        subtitle: [c.phone, c.document].filter(Boolean).join(' · '),
        url:      `/clientes/${c.id}`,
      })
    }

    for (const t of technicians.data || []) {
      results.push({
        type:     'technician',
        id:       t.id,
        title:    t.name,
        subtitle: [t.specialty, t.phone].filter(Boolean).join(' · '),
        url:      `/tecnicos`,
      })
    }

    return results
  },
}
