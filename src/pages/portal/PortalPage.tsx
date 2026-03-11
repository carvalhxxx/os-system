import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ClipboardList, CheckCircle2, XCircle,
  Wrench, User, Phone, Calendar, DollarSign,
  AlertCircle, Package,
} from 'lucide-react'
import { portalService } from '../../services/portal.service'
import { formatCurrency, formatDate } from '../../lib/utils'

// ─── Mapa de status ───────────────────────────────────────────
const STATUS_CONFIG = {
  aberta: {
    label: 'Aguardando Atendimento',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: ClipboardList,
    step: 1,
  },
  em_andamento: {
    label: 'Em Andamento',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    icon: Wrench,
    step: 2,
  },
  aguardando_peca: {
    label: 'Aguardando Peça',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    icon: Package,
    step: 2,
  },
  finalizada: {
    label: 'Concluído',
    color: 'text-green-600 bg-green-50 border-green-200',
    icon: CheckCircle2,
    step: 3,
  },
  cancelada: {
    label: 'Cancelado',
    color: 'text-red-600 bg-red-50 border-red-200',
    icon: XCircle,
    step: 0,
  },
}

const STEPS = [
  { label: 'Recebido',     step: 1 },
  { label: 'Em Serviço',   step: 2 },
  { label: 'Concluído',    step: 3 },
]

function ProgressBar({ status }: { status: string }) {
  if (status === 'cancelada') {
    return (
      <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
        <XCircle className="w-4 h-4" />
        Esta ordem foi cancelada.
      </div>
    )
  }

  const currentStep = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.step ?? 1
  const isFinished  = status === 'finalizada'

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => {
        const done    = isFinished || currentStep > s.step
        const active  = !isFinished && currentStep === s.step
        const isLast  = i === STEPS.length - 1

        return (
          <div key={s.step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-colors ${
                done   ? 'bg-green-500 border-green-500' :
                active ? 'bg-blue-600 border-blue-600' :
                         'bg-white border-gray-200'
              }`}>
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                ) : (
                  <span className={`text-xs font-bold ${active ? 'text-white' : 'text-gray-400'}`}>
                    {s.step}
                  </span>
                )}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${
                done || active ? 'text-gray-700' : 'text-gray-400'
              }`}>
                {s.label}
              </span>
            </div>

            {!isLast && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${
                currentStep > s.step || isFinished ? 'bg-green-400' : 'bg-gray-200'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value: string | null | undefined
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm text-gray-700 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default function PortalPage() {
  const { token } = useParams<{ token: string }>()

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['portal', token],
    queryFn: () => portalService.getByToken(token!),
    enabled: !!token,
    retry: false,
  })

  const statusCfg = order
    ? STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]
    : null
  const StatusIcon = statusCfg?.icon ?? ClipboardList

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Acompanhamento de Serviço</h1>
            <p className="text-xs text-gray-500">Consulte o status do seu equipamento</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Loading */}
        {isLoading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Buscando informações...</p>
          </div>
        )}

        {/* Erro */}
        {isError && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-12 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h2 className="font-semibold text-gray-800 mb-1">Ordem não encontrada</h2>
            <p className="text-sm text-gray-500">
              O link pode estar incorreto ou a ordem foi removida.
            </p>
          </div>
        )}

        {order && statusCfg && (
          <>
            {/* Card principal: número + status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Número da OS</p>
                  <h2 className="text-2xl font-bold text-gray-900 font-mono">
                    {order.order_number}
                  </h2>
                </div>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${statusCfg.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusCfg.label}
                </div>
              </div>

              {/* Barra de progresso */}
              <ProgressBar status={order.status} />
            </div>

            {/* Informações do cliente e datas */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Informações
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={User}     label="Cliente"       value={order.client?.name} />
                <InfoRow icon={Phone}    label="Telefone"      value={order.client?.phone} />
                <InfoRow icon={Calendar} label="Data de Entrada" value={formatDate(order.opened_at)} />
                <InfoRow icon={Calendar} label="Data de Conclusão" value={order.closed_at ? formatDate(order.closed_at) : 'Em aberto'} />
                {order.technician && (
                  <InfoRow icon={Wrench} label="Técnico Responsável" value={order.technician.name} />
                )}
              </div>
            </div>

            {/* Problema relatado */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Detalhes do Serviço
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1.5">Problema relatado</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">
                    {order.problem_description}
                  </p>
                </div>

                {order.diagnosis && (
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1.5">Diagnóstico</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">
                      {order.diagnosis}
                    </p>
                  </div>
                )}

                {order.service_performed && (
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1.5">Serviço realizado</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">
                      {order.service_performed}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Valor — só mostra se finalizada */}
            {order.status === 'finalizada' && order.service_value > 0 && (
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-sm font-medium">Valor Total do Serviço</p>
                    <p className="text-3xl font-bold mt-1">
                      {formatCurrency(order.service_value)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            )}

            {/* Observações (visíveis para o cliente) */}
            {order.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-2">
                  Observação
                </p>
                <p className="text-sm text-amber-800 leading-relaxed">{order.notes}</p>
              </div>
            )}

            {/* Rodapé */}
            <div className="text-center pb-4">
              <p className="text-xs text-gray-400">
                Em caso de dúvidas, entre em contato com a assistência técnica.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
