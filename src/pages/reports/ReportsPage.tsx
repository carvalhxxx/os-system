import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, ClipboardList, Users, Wrench, Package, Award, ChevronDown,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { reportsService, ReportFilters } from '../../services/reports.service'
import { formatCurrency, formatDate, STATUS_LABELS } from '../../lib/utils'
import { PageLoader } from '../../components/ui'

// ─── Preset de períodos ────────────────────────────────────
type Preset = '7d' | '30d' | '90d' | '6m' | '1y' | 'custom'

function getPresetDates(preset: Preset): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  if (preset === '7d')  from.setDate(to.getDate() - 7)
  if (preset === '30d') from.setDate(to.getDate() - 30)
  if (preset === '90d') from.setDate(to.getDate() - 90)
  if (preset === '6m')  from.setMonth(to.getMonth() - 6)
  if (preset === '1y')  from.setFullYear(to.getFullYear() - 1)
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  }
}

// ─── Cores dos gráficos ────────────────────────────────────
const CHART_COLORS = {
  revenue:  '#3b82f6',
  labor:    '#8b5cf6',
  parts:    '#06b6d4',
  orders:   '#f59e0b',
  aberta:         '#3b82f6',
  em_andamento:   '#f59e0b',
  aguardando_peca:'#8b5cf6',
  finalizada:     '#22c55e',
  cancelada:      '#ef4444',
}

// ─── Custom Tooltip ────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="font-semibold text-gray-700 dark:text-slate-300 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500 dark:text-slate-400">{p.name}:</span>
          <span className="font-semibold text-gray-800 dark:text-slate-200">
            {typeof p.value === 'number' && p.name !== 'OS'
              ? formatCurrency(p.value)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────
interface KpiProps {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  color: string
  trend?: number
}

function KpiCard({ label, value, sub, icon, color, trend }: KpiProps) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            trend >= 0
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
          }`}>
            {trend >= 0
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Section header ────────────────────────────────────────
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="text-blue-600 dark:text-blue-400">{icon}</div>
      <h2 className="text-base font-bold text-gray-800 dark:text-slate-200">{title}</h2>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────
export default function ReportsPage() {
  const { user } = useAuth()
  const [preset, setPreset] = useState<Preset>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const filters: ReportFilters = useMemo(() => {
    if (preset === 'custom' && customFrom && customTo) {
      return { date_from: customFrom, date_to: customTo }
    }
    const { from, to } = getPresetDates(preset)
    return { date_from: from, date_to: to }
  }, [preset, customFrom, customTo])

  // ─── Queries ─────────────────────────────────────────────
  const { data: monthly = [], isLoading: loadingMonthly } = useQuery({
    queryKey: ['report-monthly', user?.id, filters],
    queryFn: () => reportsService.getMonthlyRevenue(user!.id, filters),
    enabled: !!user,
  })

  // Se só tem 1 ponto, duplica para o traço aparecer no gráfico
  const chartMonthly = monthly.length === 1
    ? [{ ...monthly[0], month: '' }, monthly[0]]
    : monthly

  const { data: allOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['report-orders', user?.id, filters],
    queryFn: () => reportsService.getOrdersInPeriod(user!.id, filters),
    enabled: !!user,
  })

  const { data: statusDist = [] } = useQuery({
    queryKey: ['report-status', user?.id, filters],
    queryFn: () => reportsService.getStatusDistribution(user!.id, filters),
    enabled: !!user,
  })

  const { data: techPerf = [] } = useQuery({
    queryKey: ['report-tech', user?.id, filters],
    queryFn: () => reportsService.getTechnicianPerformance(user!.id, filters),
    enabled: !!user,
  })

  const { data: topClients = [] } = useQuery({
    queryKey: ['report-clients', user?.id, filters],
    queryFn: () => reportsService.getTopClients(user!.id, filters),
    enabled: !!user,
  })

  const { data: topParts = [] } = useQuery({
    queryKey: ['report-parts', user?.id, filters],
    queryFn: () => reportsService.getTopParts(user!.id, filters),
    enabled: !!user,
  })

  const { data: avgDays = 0 } = useQuery({
    queryKey: ['report-avg-days', user?.id, filters],
    queryFn: () => reportsService.getAvgCompletionDays(user!.id, filters),
    enabled: !!user,
  })

  // ─── KPIs calculados ─────────────────────────────────────
  const totalRevenue    = allOrders.filter(o => o.status === 'finalizada').reduce((s, o) => s + (o.service_value || 0), 0)
  const totalOrders     = allOrders.length
  const finishedOrders  = allOrders.filter(o => o.status === 'finalizada').length
  const cancelledOrders = allOrders.filter(o => o.status === 'cancelada').length
  const completionRate  = totalOrders > 0 ? Math.round((finishedOrders / totalOrders) * 100) : 0
  const avgTicket       = finishedOrders > 0 ? totalRevenue / finishedOrders : 0

  const isLoading = loadingMonthly || loadingOrders

  const PRESETS: { value: Preset; label: string }[] = [
    { value: '7d',  label: '7 dias' },
    { value: '30d', label: '30 dias' },
    { value: '90d', label: '90 dias' },
    { value: '6m',  label: '6 meses' },
    { value: '1y',  label: '1 ano' },
    { value: 'custom', label: 'Personalizado' },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Análise completa do seu negócio
          </p>
        </div>

        {/* Filtro de período */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                preset === p.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:border-blue-400'
              }`}
            >
              {p.label}
            </button>
          ))}

          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="input-field w-auto text-sm py-1.5"
              />
              <span className="text-gray-400 text-sm">até</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="input-field w-auto text-sm py-1.5"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading ? <PageLoader /> : (
        <>
          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Receita Total"
              value={formatCurrency(totalRevenue)}
              sub={`${finishedOrders} OS finalizadas`}
              icon={<DollarSign className="w-5 h-5" />}
              color="text-blue-600 bg-blue-100 dark:bg-blue-900/40"
            />
            <KpiCard
              label="Total de OS"
              value={String(totalOrders)}
              sub={`${cancelledOrders} canceladas`}
              icon={<ClipboardList className="w-5 h-5" />}
              color="text-amber-600 bg-amber-100 dark:bg-amber-900/40"
            />
            <KpiCard
              label="Ticket Médio"
              value={formatCurrency(avgTicket)}
              sub="por OS finalizada"
              icon={<TrendingUp className="w-5 h-5" />}
              color="text-green-600 bg-green-100 dark:bg-green-900/40"
            />
            <KpiCard
              label="Taxa de Conclusão"
              value={`${completionRate}%`}
              sub={`Tempo médio: ${avgDays}d`}
              icon={<Award className="w-5 h-5" />}
              color="text-purple-600 bg-purple-100 dark:bg-purple-900/40"
            />
          </div>

          {/* ── Gráfico de receita mensal (area chart) ── */}
          {monthly.length > 0 && (
            <div className="card p-6">
              <SectionTitle
                icon={<TrendingUp className="w-5 h-5" />}
                title="Receita Mensal"
              />
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartMonthly} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradLabor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.labor} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={CHART_COLORS.labor} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradParts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.parts} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={CHART_COLORS.parts} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `R$${(v / 1000).toFixed(1).replace(/\.0$/, '')}k` : `R$${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                  <Area type="monotone" dataKey="revenue" name="Total" stroke={CHART_COLORS.revenue}
                    strokeWidth={2.5} fill="url(#gradRevenue)" dot={{ r: 4, fill: CHART_COLORS.revenue }} />
                  <Area type="monotone" dataKey="labor" name="Mão de obra" stroke={CHART_COLORS.labor}
                    strokeWidth={2} fill="url(#gradLabor)" strokeDasharray="5 3" />
                  <Area type="monotone" dataKey="parts" name="Peças" stroke={CHART_COLORS.parts}
                    strokeWidth={2} fill="url(#gradParts)" strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── OS por mês + Distribuição de status ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Bar chart: OS abertas vs finalizadas por mês */}
            {monthly.length > 0 && (
              <div className="card p-6">
                <SectionTitle
                  icon={<ClipboardList className="w-5 h-5" />}
                  title="Ordens por Mês"
                />
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartMonthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="orders" name="OS" fill={CHART_COLORS.revenue} radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pie chart: distribuição de status */}
            {statusDist.length > 0 && (
              <div className="card p-6">
                <SectionTitle
                  icon={<ChevronDown className="w-5 h-5" />}
                  title="Distribuição por Status"
                />
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={220}>
                    <PieChart>
                      <Pie
                        data={statusDist}
                        dataKey="count"
                        nameKey="status"
                        cx="50%" cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {statusDist.map(entry => (
                          <Cell
                            key={entry.status}
                            fill={(CHART_COLORS as any)[entry.status] || '#94a3b8'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          value ?? 0,
                          STATUS_LABELS[name as keyof typeof STATUS_LABELS] || name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {statusDist.map(entry => (
                      <div key={entry.status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: (CHART_COLORS as any)[entry.status] || '#94a3b8' }}
                          />
                          <span className="text-xs text-gray-600 dark:text-slate-400">
                            {STATUS_LABELS[entry.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                            {entry.count}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-slate-500 w-8 text-right">
                            {entry.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Performance dos funcionários ── */}
          {techPerf.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                <SectionTitle
                  icon={<Wrench className="w-5 h-5" />}
                  title="Performance dos Funcionários"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800">
                      <th className="table-header">#</th>
                      <th className="table-header">Funcionário</th>
                      <th className="table-header text-center">Total OS</th>
                      <th className="table-header text-center">Finalizadas</th>
                      <th className="table-header text-center">Conclusão</th>
                      <th className="table-header text-right">Ticket Médio</th>
                      <th className="table-header text-right">Receita</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {techPerf.map((tech, i) => (
                      <tr key={tech.technician_id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="table-cell">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                            i === 1 ? 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300' :
                            i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' :
                            'bg-gray-50 text-gray-400 dark:bg-slate-800 dark:text-slate-500'
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="table-cell font-medium">{tech.name}</td>
                        <td className="table-cell text-center">{tech.total_orders}</td>
                        <td className="table-cell text-center">{tech.finished_orders}</td>
                        <td className="table-cell text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-green-500"
                                style={{ width: `${tech.completion_rate}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                              {tech.completion_rate}%
                            </span>
                          </div>
                        </td>
                        <td className="table-cell text-right">{formatCurrency(tech.avg_ticket)}</td>
                        <td className="table-cell text-right font-semibold text-blue-600 dark:text-blue-400">
                          {formatCurrency(tech.total_revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Top Clientes + Top Peças ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Top Clientes */}
            {topClients.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                  <SectionTitle
                    icon={<Users className="w-5 h-5" />}
                    title="Top Clientes"
                  />
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {topClients.slice(0, 7).map((client, i) => (
                    <div key={client.client_id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <span className="text-sm font-bold text-gray-300 dark:text-slate-600 w-5 text-center">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                          {client.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          {client.total_orders} OS · último: {formatDate(client.last_order)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                        {formatCurrency(client.total_spent)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Peças */}
            {topParts.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                  <SectionTitle
                    icon={<Package className="w-5 h-5" />}
                    title="Peças Mais Utilizadas"
                  />
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {topParts.slice(0, 7).map((part, i) => (
                    <div key={part.part_id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <span className="text-sm font-bold text-gray-300 dark:text-slate-600 w-5 text-center">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                          {part.name}
                        </p>
                        {part.code && (
                          <span className="font-mono text-xs text-gray-400 dark:text-slate-500">
                            {part.code}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                          {part.total_qty}x
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          {formatCurrency(part.total_revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Empty state global */}
          {totalOrders === 0 && (
            <div className="card p-16 text-center">
              <TrendingUp className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-slate-400 font-medium">
                Nenhum dado encontrado para o período selecionado
              </p>
              <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                Tente ampliar o período ou criar novas ordens de serviço.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}