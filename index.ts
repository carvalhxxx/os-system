// supabase/functions/notify-order/index.ts
// Deploy: supabase functions deploy notify-order

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'OS Manager <noreply@seudominio.com>'

// ─── Tipos ────────────────────────────────────────────────
interface OrderPayload {
  type: 'INSERT' | 'UPDATE'
  table: string
  record: ServiceOrder
  old_record?: ServiceOrder
}

interface ServiceOrder {
  id: string
  order_number: string
  status: string
  problem_description: string
  diagnosis: string | null
  service_performed: string | null
  service_value: number
  opened_at: string
  closed_at: string | null
  client_id: string
  technician_id: string | null
}

interface Client {
  name: string
  email: string | null
  phone: string
}

interface Technician {
  name: string
}

// ─── Status labels ────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  aguardando_peca: 'Aguardando Peça',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
}

const STATUS_COLORS: Record<string, string> = {
  aberta: '#3b82f6',
  em_andamento: '#f59e0b',
  aguardando_peca: '#8b5cf6',
  finalizada: '#22c55e',
  cancelada: '#ef4444',
}

// ─── Helpers ─────────────────────────────────────────────
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

// ─── Email templates ──────────────────────────────────────
function baseTemplate(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#2563eb;border-radius:12px 12px 0 0;padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:8px;padding:8px 12px;font-size:18px;">🔧</span>
                    <span style="display:inline-block;vertical-align:middle;margin-left:12px;color:#fff;font-size:20px;font-weight:700;">OS Manager</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px;border-radius:0 0 12px 12px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Este email foi enviado automaticamente pelo OS Manager.<br/>
                Por favor, não responda este email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function orderInfoTable(order: ServiceOrder, technician: Technician | null): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
    <tr style="background:#f8fafc;">
      <td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;width:40%;">Nº da OS</td>
      <td style="padding:12px 16px;font-size:13px;color:#1e293b;font-weight:700;font-family:monospace;">${order.order_number}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;border-top:1px solid #e2e8f0;">Status</td>
      <td style="padding:12px 16px;border-top:1px solid #e2e8f0;">
        <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;background:${STATUS_COLORS[order.status]}20;color:${STATUS_COLORS[order.status]};">
          ${STATUS_LABELS[order.status] ?? order.status}
        </span>
      </td>
    </tr>
    <tr style="background:#f8fafc;">
      <td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;border-top:1px solid #e2e8f0;">Técnico</td>
      <td style="padding:12px 16px;font-size:13px;color:#1e293b;border-top:1px solid #e2e8f0;">${technician?.name ?? 'Não atribuído'}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;border-top:1px solid #e2e8f0;">Abertura</td>
      <td style="padding:12px 16px;font-size:13px;color:#1e293b;border-top:1px solid #e2e8f0;">${formatDate(order.opened_at)}</td>
    </tr>
    ${order.closed_at ? `
    <tr style="background:#f8fafc;">
      <td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;border-top:1px solid #e2e8f0;">Conclusão</td>
      <td style="padding:12px 16px;font-size:13px;color:#1e293b;border-top:1px solid #e2e8f0;">${formatDate(order.closed_at)}</td>
    </tr>` : ''}
    <tr style="${order.closed_at ? '' : 'background:#f8fafc;'}">
      <td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;border-top:1px solid #e2e8f0;">Valor</td>
      <td style="padding:12px 16px;font-size:15px;color:#2563eb;font-weight:700;border-top:1px solid #e2e8f0;">${formatCurrency(order.service_value)}</td>
    </tr>
  </table>`
}

// ─── Template: OS Criada ──────────────────────────────────
function templateOsCreated(order: ServiceOrder, client: Client, technician: Technician | null): string {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;color:#1e293b;font-weight:700;">
      Nova Ordem de Serviço aberta
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;">
      Olá, <strong>${client.name}</strong>! Sua ordem de serviço foi registrada com sucesso.
    </p>

    ${orderInfoTable(order, technician)}

    <div style="background:#f0f9ff;border-left:4px solid #3b82f6;border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#1d4ed8;">Problema relatado</p>
      <p style="margin:0;font-size:14px;color:#334155;">${order.problem_description}</p>
    </div>

    <p style="font-size:14px;color:#64748b;margin:24px 0 0;">
      Entraremos em contato assim que houver atualizações. Em caso de dúvidas, entre em contato conosco.
    </p>`

  return baseTemplate(content, `OS ${order.order_number} — Aberta`)
}

// ─── Template: Status Alterado ────────────────────────────
function templateStatusChanged(
  order: ServiceOrder,
  client: Client,
  technician: Technician | null,
  oldStatus: string
): string {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;color:#1e293b;font-weight:700;">
      Status da OS atualizado
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;">
      Olá, <strong>${client.name}</strong>! O status da sua ordem de serviço foi atualizado.
    </p>

    <!-- Status change visual -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td align="center" style="padding:20px;background:#f8fafc;border-radius:12px;">
          <span style="display:inline-block;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;background:${STATUS_COLORS[oldStatus] ?? '#94a3b8'}20;color:${STATUS_COLORS[oldStatus] ?? '#94a3b8'};">
            ${STATUS_LABELS[oldStatus] ?? oldStatus}
          </span>
          <span style="display:inline-block;margin:0 12px;font-size:20px;color:#94a3b8;">→</span>
          <span style="display:inline-block;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;background:${STATUS_COLORS[order.status]}20;color:${STATUS_COLORS[order.status]};">
            ${STATUS_LABELS[order.status] ?? order.status}
          </span>
        </td>
      </tr>
    </table>

    ${orderInfoTable(order, technician)}

    ${order.diagnosis ? `
    <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#15803d;">Diagnóstico</p>
      <p style="margin:0;font-size:14px;color:#334155;">${order.diagnosis}</p>
    </div>` : ''}

    <p style="font-size:14px;color:#64748b;margin:24px 0 0;">
      Qualquer dúvida, entre em contato conosco.
    </p>`

  return baseTemplate(content, `OS ${order.order_number} — Status atualizado`)
}

// ─── Template: OS Finalizada ──────────────────────────────
function templateOsFinished(order: ServiceOrder, client: Client, technician: Technician | null): string {
  const content = `
    <!-- Hero verde -->
    <div style="text-align:center;padding:32px 0 24px;">
      <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">✅</div>
      <h1 style="margin:16px 0 8px;font-size:24px;color:#1e293b;font-weight:700;">
        Serviço concluído!
      </h1>
      <p style="margin:0;font-size:15px;color:#64748b;">
        Olá, <strong>${client.name}</strong>! Seu serviço foi finalizado com sucesso.
      </p>
    </div>

    ${orderInfoTable(order, technician)}

    ${order.service_performed ? `
    <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#15803d;">Serviço realizado</p>
      <p style="margin:0;font-size:14px;color:#334155;">${order.service_performed}</p>
    </div>` : ''}

    <!-- Valor destaque -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="background:#eff6ff;border-radius:12px;padding:24px;">
          <p style="margin:0 0 4px;font-size:13px;color:#64748b;">Valor total do serviço</p>
          <p style="margin:0;font-size:32px;font-weight:800;color:#2563eb;">${formatCurrency(order.service_value)}</p>
        </td>
      </tr>
    </table>

    <p style="font-size:14px;color:#64748b;text-align:center;margin:0;">
      Agradecemos sua confiança! 🙏
    </p>`

  return baseTemplate(content, `OS ${order.order_number} — Finalizada`)
}

// ─── Template: OS Cancelada ───────────────────────────────
function templateOsCancelled(order: ServiceOrder, client: Client): string {
  const content = `
    <div style="text-align:center;padding:32px 0 24px;">
      <div style="display:inline-block;background:#fee2e2;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">❌</div>
      <h1 style="margin:16px 0 8px;font-size:24px;color:#1e293b;font-weight:700;">
        Ordem de Serviço cancelada
      </h1>
      <p style="margin:0;font-size:15px;color:#64748b;">
        Olá, <strong>${client.name}</strong>. Sua ordem de serviço foi cancelada.
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr style="background:#f8fafc;">
        <td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;width:40%;">Nº da OS</td>
        <td style="padding:12px 16px;font-size:13px;color:#1e293b;font-weight:700;font-family:monospace;">${order.order_number}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;border-top:1px solid #e2e8f0;">Abertura</td>
        <td style="padding:12px 16px;font-size:13px;color:#1e293b;border-top:1px solid #e2e8f0;">${formatDate(order.opened_at)}</td>
      </tr>
    </table>

    ${order.notes ? `
    <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#c2410c;">Observações</p>
      <p style="margin:0;font-size:14px;color:#334155;">${order.notes}</p>
    </div>` : ''}

    <p style="font-size:14px;color:#64748b;margin:24px 0 0;">
      Se tiver dúvidas sobre o cancelamento, entre em contato conosco.
    </p>`

  return baseTemplate(content, `OS ${order.order_number} — Cancelada`)
}

// ─── Enviar email via Resend ──────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error: ${res.status} — ${err}`)
  }
}

// ─── Buscar dados no Supabase ─────────────────────────────
async function fetchClient(clientId: string): Promise<Client | null> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?id=eq.${clientId}&select=name,email,phone`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  )
  const data = await res.json()
  return data?.[0] ?? null
}

async function fetchTechnician(techId: string | null): Promise<Technician | null> {
  if (!techId) return null
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/technicians?id=eq.${techId}&select=name`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  )
  const data = await res.json()
  return data?.[0] ?? null
}

// ─── Handler principal ────────────────────────────────────
serve(async (req) => {
  try {
    const payload: OrderPayload = await req.json()
    const { type, record, old_record } = payload

    const order = record
    const isInsert = type === 'INSERT'
    const statusChanged = !isInsert && old_record?.status !== order.status

    // Só processa eventos relevantes
    const isRelevant =
      isInsert ||
      statusChanged

    if (!isRelevant) {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 })
    }

    // Busca cliente e técnico
    const [client, technician] = await Promise.all([
      fetchClient(order.client_id),
      fetchTechnician(order.technician_id),
    ])

    // Cliente sem email → pula
    if (!client?.email) {
      console.log(`Cliente ${order.client_id} sem email, pulando notificação`)
      return new Response(JSON.stringify({ skipped: 'no_email' }), { status: 200 })
    }

    let subject = ''
    let html = ''

    if (isInsert) {
      // OS criada
      subject = `✅ OS ${order.order_number} — Recebemos seu chamado`
      html = templateOsCreated(order, client, technician)

    } else if (statusChanged) {
      if (order.status === 'finalizada') {
        subject = `🎉 OS ${order.order_number} — Serviço concluído!`
        html = templateOsFinished(order, client, technician)

      } else if (order.status === 'cancelada') {
        subject = `❌ OS ${order.order_number} — Ordem cancelada`
        html = templateOsCancelled(order, client)

      } else {
        // Qualquer outra mudança de status
        subject = `🔄 OS ${order.order_number} — Status: ${STATUS_LABELS[order.status] ?? order.status}`
        html = templateStatusChanged(order, client, technician, old_record?.status ?? '')
      }
    }

    await sendEmail(client.email, subject, html)
    console.log(`Email enviado para ${client.email} — ${subject}`)

    return new Response(JSON.stringify({ sent: true, to: client.email }), { status: 200 })

  } catch (err) {
    console.error('Erro na Edge Function:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
