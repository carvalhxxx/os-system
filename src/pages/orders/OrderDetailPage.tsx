import { useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Edit2, Download, Printer, Paperclip, Lock,
  FileText, Image, Upload, X, Loader2, Share2, Wrench, Phone,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ordersService } from '../../services/orders.service'
import { attachmentsService } from '../../services/attachments.service'
import { orderItemsService } from '../../services/orderItems.service'
import { OrderStatus } from '../../types'
import { StatusBadge, PageLoader, ConfirmDialog, Modal } from '../../components/ui'
import { formatCurrency, formatDate, formatDateTime, formatFileSize } from '../../lib/utils'
import { exportOrderToPDF } from '../../lib/pdf'
import { OrderItemsPanel } from '../../components/OrderItemsPanel'
import { PaymentPanel } from '../../components/PaymentPanel'
import { ShareOrderModal } from '../../components/ShareOrderModal'
import { useCompanySettings } from '../../hooks/useCompanySettings'
import toast from 'react-hot-toast'

// Resumo financeiro — lê itens direto do cache para ficar sempre em sincronia
function FinancialSummary({ orderId, laborValue }: { orderId: string; laborValue: number }) {
  const { data: items = [] } = useQuery({
    queryKey: ['order-items', orderId],
    queryFn: () => orderItemsService.getByOrderId(orderId),
    enabled: !!orderId,
  })

  const partsTotal = items.reduce((sum, i) => sum + i.total_price, 0)
  const grandTotal = partsTotal + laborValue

  return (
    <div className="card p-5">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">
        Resumo Financeiro
      </h3>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-slate-400">Mão de obra</span>
          <span className="font-medium text-gray-700 dark:text-slate-300">
            {formatCurrency(laborValue)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-slate-400">Peças e materiais</span>
          <span className="font-medium text-gray-700 dark:text-slate-300">
            {formatCurrency(partsTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2.5 border-t border-gray-200 dark:border-slate-700">
          <span className="font-bold text-gray-900 dark:text-white">Total</span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </div>
    </div>
  )
}

// Botão que gera signed URL e abre o arquivo
function DownloadButton({ storagePath, fileName }: { storagePath: string; fileName: string }) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const url = await attachmentsService.getSignedUrl(storagePath, 120)
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch {
      toast.error('Erro ao baixar arquivo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="p-1.5 rounded text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
      title={`Abrir ${fileName}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
    </button>
  )
}

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'aguardando_peca', label: 'Aguardando Peça' },
  { value: 'finalizada', label: 'Finalizada' },
  { value: 'cancelada', label: 'Cancelada' },
]

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [deleteAttachment, setDeleteAttachment] = useState<string | null>(null)
  const [techModalOpen, setTechModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const { settings: company } = useCompanySettings()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersService.getById(id!),
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const { data: orderItems = [] } = useQuery({
    queryKey: ['order-items', id],
    queryFn: () => orderItemsService.getByOrderId(id!),
    enabled: !!id,
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: OrderStatus) => ordersService.updateStatus(id!, status),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Status atualizado!')
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao atualizar status'),
  })

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachId: string) => {
      const att = order?.attachments?.find(a => a.id === attachId)
      if (!att) throw new Error('Not found')
      return attachmentsService.delete(att)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] })
      toast.success('Anexo removido!')
      setDeleteAttachment(null)
    },
    onError: () => toast.error('Erro ao remover anexo'),
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length || !user || !id) return

    // Guard extra — não deve chegar aqui, mas por segurança
    const currentOrder = await ordersService.getById(id)
    if (currentOrder.status === 'finalizada' || currentOrder.status === 'cancelada') {
      toast.error('Esta OS está finalizada e não aceita novos anexos.')
      return
    }

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        await attachmentsService.upload(user.id, id, file)
      }
      qc.invalidateQueries({ queryKey: ['order', id] })
      toast.success(`${files.length} arquivo(s) enviado(s)!`)
    } catch {
      toast.error('Erro ao enviar arquivo')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handlePrint = () => { if (order) exportOrderToPDF(order, orderItems, 'print', company) }

  if (isLoading || !order) return <PageLoader />

  const isLocked = true // visualização sempre somente leitura
  const canEdit = order.status !== 'finalizada' && order.status !== 'cancelada'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                {order.order_number}
              </h1>
              <StatusBadge status={order.status} />
              {isLocked && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400">
                  <Lock className="w-3 h-3" /> Bloqueada
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              Aberta em {formatDateTime(order.opened_at)}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Status: bloqueado se finalizada/cancelada */}
          {canEdit ? (
            <select
              value={order.status}
              onChange={e => updateStatusMutation.mutate(e.target.value as OrderStatus)}
              className="input-field w-auto text-sm"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : null}

          <button onClick={handlePrint} className="btn-secondary" title="Abrir PDF para impressão">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button onClick={() => exportOrderToPDF(order, orderItems, 'download', company)} className="btn-secondary" title="Baixar PDF">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => setShareOpen(true)} className="btn-secondary" title="Enviar para cliente">
            <Share2 className="w-4 h-4" /> Enviar
          </button>

          {/* Editar: só disponível se não estiver bloqueada */}
          {canEdit && (
            <Link to={`/ordens/${id}/editar`} className="btn-primary">
              <Edit2 className="w-4 h-4" /> Editar
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client + Technician */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-4">
              Participantes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Cliente</p>
                <p className="font-semibold text-gray-900 dark:text-white">{order.client?.name || '—'}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">{order.client?.phone}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">{order.client?.email || ''}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Funcionário</p>
                {order.technician ? (
                  <button
                    onClick={() => setTechModalOpen(true)}
                    className="text-left group"
                  >
                    <p className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {order.technician.name}
                    </p>
                    {order.technician.specialty && (
                      <p className="text-sm text-gray-500 dark:text-slate-400">{order.technician.specialty}</p>
                    )}
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      Ver perfil
                    </p>
                  </button>
                ) : (
                  <p className="font-semibold text-gray-400 dark:text-slate-500">Não atribuído</p>
                )}
              </div>
            </div>
          </div>

          {/* Descriptions */}
          <div className="card p-6 space-y-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
              Descrições
            </h3>

            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Problema relatado</p>
              <p className="text-sm text-gray-800 dark:text-slate-200 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg">
                {order.problem_description}
              </p>
            </div>

            {order.diagnosis && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Diagnóstico</p>
                <p className="text-sm text-gray-800 dark:text-slate-200 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg">
                  {order.diagnosis}
                </p>
              </div>
            )}

            {order.service_performed && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Serviço realizado</p>
                <p className="text-sm text-gray-800 dark:text-slate-200 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg">
                  {order.service_performed}
                </p>
              </div>
            )}

            {order.notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Observações</p>
                <p className="text-sm text-gray-800 dark:text-slate-200 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg">
                  {order.notes}
                </p>
              </div>
            )}
          </div>

          {/* Peças e Materiais */}
          <OrderItemsPanel
            orderId={order.id}
            laborValue={order.labor_value ?? 0}
            onTotalChange={() => {}}
            readOnly={isLocked}
          />

          {/* Attachments */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                Anexos ({order.attachments?.length || 0})
              </h3>
              {!isLocked && (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="btn-secondary text-sm"
                >
                  {uploading ? <>Enviando...</> : <><Upload className="w-4 h-4" /> Anexar</>}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={handleUpload}
              />
            </div>

            {!order.attachments?.length ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
                <Paperclip className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-slate-400">Nenhum anexo</p>
                {!isLocked && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="text-xs text-blue-600 mt-1 hover:underline"
                  >
                    Clique para anexar
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {order.attachments.map(att => {
                  const isImage = att.file_type.startsWith('image/')
                  return (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-900/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                        {isImage ? (
                          <Image className="w-4 h-4 text-blue-500" />
                        ) : (
                          <FileText className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate">
                          {att.file_name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          {formatFileSize(att.file_size)}
                        </p>
                      </div>
                      <DownloadButton storagePath={att.storage_path} fileName={att.file_name} />
                      {!isLocked && (
                        <button
                          onClick={() => setDeleteAttachment(att.id)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 transition-colors"
                          title="Remover"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <FinancialSummary
            orderId={order.id}
            laborValue={order.labor_value ?? order.service_value}
          />

          {/* Pagamento — só aparece para OS finalizadas */}
          {order.status === 'finalizada' && (
            <PaymentPanel order={order} />
          )}

          <div className="card p-5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">
              Datas
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 dark:text-slate-500">Abertura</p>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{formatDate(order.opened_at)}</p>
              </div>
              {order.closed_at && (
                <div>
                  <p className="text-xs text-gray-400 dark:text-slate-500">Conclusão</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{formatDate(order.closed_at)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 dark:text-slate-500">Última atualização</p>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{formatDate(order.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteAttachment}
        onClose={() => setDeleteAttachment(null)}
        onConfirm={() => deleteAttachment && deleteAttachmentMutation.mutate(deleteAttachment)}
        title="Remover Anexo"
        message="Tem certeza que deseja remover este anexo?"
        confirmLabel="Remover"
        loading={deleteAttachmentMutation.isPending}
      />

      <ShareOrderModal
        order={order}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      {/* Modal do funcionário */}
      {order.technician && (
        <Modal open={techModalOpen} onClose={() => setTechModalOpen(false)} title="Funcionário Responsável" size="sm">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                <Wrench className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{order.technician.name}</p>
                {order.technician.specialty && (
                  <p className="text-sm text-gray-500 dark:text-slate-400">{order.technician.specialty}</p>
                )}
              </div>
            </div>

            {(order.technician as any).phone && (
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-slate-300">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{(order.technician as any).phone}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
              <Link
                to={`/tecnicos/${order.technician.id}`}
                className="btn-secondary flex-1 justify-center text-sm"
                onClick={() => setTechModalOpen(false)}
              >
                Ver perfil completo
              </Link>
              <button className="btn-secondary flex-1 justify-center text-sm" onClick={() => setTechModalOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}