import { useState, useEffect } from 'react'
import { Share2, Copy, Check, MessageCircle, ExternalLink, Loader2 } from 'lucide-react'
import { portalService } from '.././services/portal.service'
import { ServiceOrder } from '.././types'
import { Modal } from './ui'
import toast from 'react-hot-toast'

interface ShareOrderModalProps {
  order: ServiceOrder
  open: boolean
  onClose: () => void
}

export function ShareOrderModal({ order, open, onClose }: ShareOrderModalProps) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const portalUrl = token
    ? `${window.location.origin}/acompanhar/${token}`
    : null

  useEffect(() => {
    if (!open) return
    setLoading(true)
    portalService.getTokenByOrderId(order.id)
      .then(t => setToken(t))
      .catch(() => toast.error('Erro ao gerar link'))
      .finally(() => setLoading(false))
  }, [open, order.id])

  const handleCopy = async () => {
    if (!portalUrl) return
    await navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2500)
  }

  const handleWhatsApp = () => {
    if (!portalUrl || !order.client) return

    const phone = (order.client as any).phone?.replace(/\D/g, '') || ''
    const msg = encodeURIComponent(
      `Olá${(order.client as any).name ? `, ${(order.client as any).name}` : ''}! 👋\n\n` +
      `Sua ordem de serviço *${order.order_number}* foi registrada.\n\n` +
      `Você pode acompanhar o status em tempo real pelo link abaixo:\n` +
      `${portalUrl}\n\n` +
      `Qualquer dúvida, estamos à disposição!`
    )

    const url = phone
      ? `https://wa.me/55${phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`

    window.open(url, '_blank')
  }

  const handleOpenPortal = () => {
    if (portalUrl) window.open(portalUrl, '_blank')
  }

  return (
    <Modal open={open} onClose={onClose} title="Enviar para o Cliente" size="sm">
      <div className="space-y-5">

        {/* Número da OS */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center shrink-0">
            <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-500">Compartilhando</p>
            <p className="text-sm font-bold text-gray-800 dark:text-slate-200 font-mono">
              {order.order_number}
            </p>
          </div>
        </div>

        {/* Link */}
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Link do Portal
          </p>
          {loading ? (
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span className="text-sm text-gray-400">Gerando link...</span>
            </div>
          ) : portalUrl ? (
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-slate-400 flex-1 truncate font-mono">
                {portalUrl}
              </p>
              <button
                onClick={handleCopy}
                className="shrink-0 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                title="Copiar link"
              >
                {copied
                  ? <Check className="w-4 h-4 text-green-500" />
                  : <Copy className="w-4 h-4 text-gray-400" />
                }
              </button>
            </div>
          ) : (
            <p className="text-sm text-red-500">Não foi possível gerar o link.</p>
          )}
        </div>

        {/* Ações */}
        <div className="grid grid-cols-1 gap-2.5">
          <button
            onClick={handleWhatsApp}
            disabled={!portalUrl}
            className="flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl font-semibold text-sm
              bg-[#25D366] hover:bg-[#20c05c] text-white transition-colors disabled:opacity-50"
          >
            <MessageCircle className="w-4 h-4" />
            Enviar via WhatsApp
          </button>

          <button
            onClick={handleCopy}
            disabled={!portalUrl}
            className="flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl font-semibold text-sm
              btn-secondary disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Link copiado!' : 'Copiar Link'}
          </button>

          <button
            onClick={handleOpenPortal}
            disabled={!portalUrl}
            className="flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl font-semibold text-sm
              btn-secondary disabled:opacity-50"
          >
            <ExternalLink className="w-4 h-4" />
            Visualizar Portal
          </button>
        </div>

        <p className="text-xs text-center text-gray-400 dark:text-slate-500">
          O cliente verá o status, diagnóstico e valor ao acessar o link.
        </p>
      </div>
    </Modal>
  )
}
