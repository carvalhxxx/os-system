import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ServiceOrder, OrderItem, CompanySettings } from '../types'
import { formatCurrency, formatDate, formatDateTime, STATUS_LABELS } from './utils'

type DocWithTable = jsPDF & { lastAutoTable: { finalY: number } }

function getY(doc: jsPDF): number {
  return (doc as DocWithTable).lastAutoTable?.finalY ?? 0
}

// Paleta vintage — sem cores sólidas, só preto/cinza
const C = {
  black:    [20, 20, 20]   as [number, number, number],
  dark:     [50, 50, 50]   as [number, number, number],
  mid:      [100, 100, 100] as [number, number, number],
  light:    [170, 170, 170] as [number, number, number],
  ultralight: [230, 230, 230] as [number, number, number],
  white:    [255, 255, 255] as [number, number, number],
}

// Desenha título de seção estilo vintage (linha + texto + linha)
function sectionTitle(doc: jsPDF, text: string, y: number) {
  const pageW = 210
  const margin = 14
  doc.setDrawColor(...C.mid)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  doc.setFillColor(...C.white)
  const textW = doc.getTextWidth(text) + 6
  const cx = pageW / 2
  doc.rect(cx - textW / 2, y - 3.5, textW, 5, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.mid)
  doc.text(text, cx, y, { align: 'center' })
  doc.setTextColor(...C.black)
}

export function exportOrderToPDF(
  order: ServiceOrder,
  items: OrderItem[] = [],
  mode: 'download' | 'print' = 'download',
  company?: Partial<CompanySettings> | null,
): void {
  const doc = new jsPDF()
  const companyName = company?.name || 'OS Manager'
  const pageW = 210
  const margin = 14


  // ─── Header ──────────────────────────────────────────────
  // Coluna esquerda: logo + dados da empresa (até x=120)
  // Coluna direita: caixa OS (x=130 até x=196)
  const colLeft  = margin          // 14
  const colRight = 130             // início da caixa OS
  const colRightCenter = (colRight + pageW - margin) / 2  // ~163

  // Logo (se houver)
  let hasLogo = false
  if (company?.logo_url) {
    try {
      doc.addImage(company.logo_url, 'PNG', colLeft, 13, 20, 20)
      hasLogo = true
    } catch (_) { /* sem logo */ }
  }

  const textX = hasLogo ? colLeft + 24 : colLeft

  // Nome da empresa
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.black)
  doc.text(companyName.toUpperCase(), textX, 20)

  // Dados da empresa
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.mid)
  let infoY = 25
  if (company?.phone || company?.email) {
    doc.text([company.phone, company.email].filter(Boolean).join('   |   '), textX, infoY)
    infoY += 4
  }
  if (company?.address || company?.city) {
    doc.text([company.address, company.city, company.state].filter(Boolean).join(', '), textX, infoY)
    infoY += 4
  }
  if (company?.document) {
    doc.text(`CNPJ: ${company.document}`, textX, infoY)
    infoY += 4
  }

  // Linha separadora vertical entre colunas
  doc.setDrawColor(...C.ultralight)
  doc.setLineWidth(0.3)
  doc.line(colRight - 4, 13, colRight - 4, 38)

  // Caixa OS (coluna direita)
  doc.setDrawColor(...C.light)
  doc.setLineWidth(0.3)
  doc.rect(colRight, 13, pageW - margin - colRight, 18)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.mid)
  doc.text('ORDEM DE SERVIÇO', colRightCenter, 19, { align: 'center' })

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.black)
  doc.text(order.order_number, colRightCenter, 27, { align: 'center' })

  // Linha separadora geral abaixo do header
  doc.setDrawColor(...C.light)
  doc.setLineWidth(0.3)
  doc.line(margin, 36, pageW - margin, 36)

  // Emissão e status abaixo da linha
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.mid)
  doc.text(`Emitido: ${formatDateTime(new Date().toISOString())}`, pageW - margin, 40, { align: 'right' })
  doc.text(`Status: ${STATUS_LABELS[order.status]}`, margin, 40)

  // ─── Dados do cliente ─────────────────────────────────────
  let y = 44
  sectionTitle(doc, 'DADOS DO CLIENTE', y)
  y += 4

  if (order.client) {
    autoTable(doc, {
      startY: y,
      head: [],
      body: [
        ['Nome', order.client.name, 'CPF/CNPJ', order.client.document],
        ['Telefone', order.client.phone, 'Email', order.client.email || '—'],
        ['Endereço', [order.client.address, order.client.city, order.client.state].filter(Boolean).join(', ') || '—', '', ''],
      ],
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: C.dark, lineWidth: 0 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 22, textColor: C.mid },
        2: { fontStyle: 'bold', cellWidth: 22, textColor: C.mid },
      },
      margin: { left: margin, right: margin },
    })
  }

  // ─── Detalhes da OS ───────────────────────────────────────
  y = getY(doc) + 7
  sectionTitle(doc, 'DETALHES DA ORDEM', y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      ['Funcionário', order.technician?.name || 'Não atribuído', 'Abertura', formatDate(order.opened_at)],
      ['Mão de Obra', formatCurrency(order.labor_value ?? 0), 'Previsão / Conclusão', formatDate(order.closed_at)],
    ],
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: C.dark, lineColor: C.ultralight, lineWidth: 0.2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30, textColor: C.mid },
      2: { fontStyle: 'bold', cellWidth: 40, textColor: C.mid },
    },
    margin: { left: margin, right: margin },
  })

  // ─── Dados do aparelho ────────────────────────────────────
  const hasDevice = order.device_brand || order.device_model || order.device_imei || order.device_color
  if (hasDevice) {
    y = getY(doc) + 7
    sectionTitle(doc, 'DADOS DO APARELHO', y)
    y += 4

    const deviceBody: string[][] = []
    if (order.device_brand || order.device_model)
      deviceBody.push(['Marca / Modelo', `${order.device_brand || '—'} / ${order.device_model || '—'}`, 'Cor', order.device_color || '—'])
    if (order.device_imei)
      deviceBody.push(['IMEI / Nº Série', order.device_imei, '', ''])

    autoTable(doc, {
      startY: y,
      head: [],
      body: deviceBody,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: C.dark, lineWidth: 0 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 30, textColor: C.mid },
        2: { fontStyle: 'bold', cellWidth: 20, textColor: C.mid },
      },
      margin: { left: margin, right: margin },
    })
  }

  // ─── Peças e materiais ────────────────────────────────────
  if (items.length > 0) {
    y = getY(doc) + 7
    sectionTitle(doc, 'PEÇAS E MATERIAIS', y)
    y += 4

    const partsTotal = items.reduce((sum, i) => sum + i.total_price, 0)
    const laborValue = order.labor_value ?? 0
    const grandTotal = partsTotal + laborValue

    autoTable(doc, {
      startY: y,
      head: [['Código', 'Descrição', 'Qtd', 'Vlr. Unit.', 'Subtotal']],
      body: items.map(item => [
        item.part?.code || '—',
        item.part?.name || '—',
        String(item.quantity),
        formatCurrency(item.unit_price),
        formatCurrency(item.total_price),
      ]),
      foot: [
        [{ content: `Mão de obra: ${formatCurrency(laborValue)}`, colSpan: 3, styles: { halign: 'right', fontStyle: 'normal', textColor: C.mid } },
         { content: 'Total peças:', styles: { fontStyle: 'bold', halign: 'right', textColor: C.dark } },
         { content: formatCurrency(partsTotal), styles: { fontStyle: 'bold', textColor: C.dark } }],
        [{ content: 'TOTAL GERAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fontSize: 10, textColor: C.black } },
         { content: formatCurrency(grandTotal), styles: { fontStyle: 'bold', fontSize: 10, textColor: C.black } }],
      ],
      theme: 'plain',
      headStyles: { fillColor: false, textColor: C.mid, fontStyle: 'bold', fontSize: 8, lineColor: C.light, lineWidth: 0.2 },
      footStyles: { fontSize: 8.5, lineWidth: 0 },
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: C.dark, lineWidth: 0 },
      columnStyles: {
        0: { cellWidth: 25 },
        2: { halign: 'center', cellWidth: 14 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 28 },
      },
      margin: { left: margin, right: margin },

    })
  } else {
    y = getY(doc) + 7
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.black)
    doc.text(`VALOR TOTAL: ${formatCurrency(order.service_value)}`, pageW - margin, y, { align: 'right' })
  }

  // ─── Seções de texto ──────────────────────────────────────
  const sections = [
    { title: 'DESCRIÇÃO DO PROBLEMA', text: order.problem_description },
    { title: 'DIAGNÓSTICO',           text: order.diagnosis },
    { title: 'SERVIÇO REALIZADO',     text: order.service_performed },
    { title: 'OBSERVAÇÕES',           text: order.notes },
  ]

  for (const section of sections) {
    if (!section.text) continue
    y = getY(doc) + 7
    if (y > 250) { doc.addPage(); y = 20 }
    sectionTitle(doc, section.title, y)
    y += 5
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.dark)
    const lines = doc.splitTextToSize(section.text, pageW - margin * 2)
    doc.text(lines, margin, y)
    ;(doc as DocWithTable).lastAutoTable = { finalY: y + lines.length * 4.5 }
  }

  // ─── Termo de responsabilidade ───────────────────────────
  const termo = 'Assumo total responsabilidade pelo aparelho acima citado, estando ciente de que serviços de reset e atualização implicam na perda de dados pessoais contidos no aparelho. A garantia será cancelada em caso de mau uso, queda, exposição à umidade, danos elétricos ou tentativa de conserto por terceiros não autorizados. Comprometo-me a retirar o aparelho em até 30 (trinta) dias; após 90 (noventa) dias o aparelho poderá ser vendido para cobrir custos.'

  y = getY(doc) + 7
  if (y > 235) { doc.addPage(); y = 20 }
  sectionTitle(doc, 'TERMO DE RESPONSABILIDADE', y)
  y += 5

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...C.mid)
  const termoLines = doc.splitTextToSize(termo, pageW - margin * 2)
  doc.text(termoLines, margin, y)
  y = y + termoLines.length * 3.8 + 8

  // ─── Assinaturas ─────────────────────────────────────────
  if (y > 260) { doc.addPage(); y = 20 }
  doc.setDrawColor(...C.light)
  doc.setLineWidth(0.3)
  doc.line(margin, y, margin + 72, y)
  doc.line(pageW - margin - 72, y, pageW - margin, y)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.light)
  doc.text('Assinatura do Cliente', margin + 36, y + 4.5, { align: 'center' })
  doc.text('Assinatura do Funcionário', pageW - margin - 36, y + 4.5, { align: 'center' })

  // Data
  doc.setTextColor(...C.mid)
  doc.text(`______/______/________`, pageW / 2, y, { align: 'center' })
  doc.setFontSize(7)
  doc.text('Data', pageW / 2, y + 4.5, { align: 'center' })

  // ─── Rodapé em todas as páginas ───────────────────────────
  const pageCount = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.light)
    doc.text(companyName, 105, 290, { align: 'center' })
    doc.text(`Página ${i} de ${pageCount}`, pageW - margin, 290, { align: 'right' })
  }

  if (mode === 'print') {
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) {
      win.onload = () => { win.focus(); win.print(); setTimeout(() => URL.revokeObjectURL(url), 60000) }
    }
  } else {
    doc.save(`${order.order_number}.pdf`)
  }
}

// ─────────────────────────────────────────────────────────────
// PDF de Orçamento
// ─────────────────────────────────────────────────────────────
import type { Quote } from '../services/quotes.service'

export function exportQuoteToPDF(
  quote: Quote,
  mode: 'download' | 'print' = 'download',
  company?: Partial<CompanySettings> | null,
): void {
  const doc = new jsPDF()
  const companyName = company?.name || 'OS Manager'
  const pageW = 210
  const margin = 14

  // ─── Header ──────────────────────────────────────────────
  const colLeft  = margin
  const colRight = 130
  const colRightCenter = (colRight + pageW - margin) / 2

  let hasLogo = false
  if (company?.logo_url) {
    try { doc.addImage(company.logo_url, 'PNG', colLeft, 13, 20, 20); hasLogo = true } catch (_) { /* sem logo */ }
  }

  const textX = hasLogo ? colLeft + 24 : colLeft

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.black)
  doc.text(companyName.toUpperCase(), textX, 20)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.mid)
  let infoY = 25
  if (company?.phone || company?.email) { doc.text([company.phone, company.email].filter(Boolean).join('   |   '), textX, infoY); infoY += 4 }
  if (company?.address || company?.city) { doc.text([company.address, company.city, company.state].filter(Boolean).join(', '), textX, infoY); infoY += 4 }
  if (company?.document) { doc.text(`CNPJ: ${company.document}`, textX, infoY) }

  doc.setDrawColor(...C.ultralight)
  doc.setLineWidth(0.3)
  doc.line(colRight - 4, 13, colRight - 4, 38)

  doc.setDrawColor(...C.light)
  doc.setLineWidth(0.3)
  doc.rect(colRight, 13, pageW - margin - colRight, 18)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.mid)
  doc.text('ORÇAMENTO', colRightCenter, 19, { align: 'center' })

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.black)
  doc.text(quote.quote_number, colRightCenter, 27, { align: 'center' })

  doc.setDrawColor(...C.light)
  doc.setLineWidth(0.3)
  doc.line(margin, 36, pageW - margin, 36)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.mid)
  doc.text(`Emitido: ${formatDateTime(new Date().toISOString())}`, pageW - margin, 40, { align: 'right' })

  // ─── Cliente ──────────────────────────────────────────────
  let y = 44
  sectionTitle(doc, 'DADOS DO CLIENTE', y)
  y += 4

  if (quote.client) {
    autoTable(doc, {
      startY: y,
      head: [],
      body: [
        ['Nome', quote.client.name],
        ['Contato', [quote.client.phone, quote.client.email].filter(Boolean).join('   |   ')],
      ],
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: C.dark, lineWidth: 0 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 22, textColor: C.mid } },
      margin: { left: margin, right: margin },
    })
  }

  // ─── Descrição ────────────────────────────────────────────
  y = getY(doc) + 7
  sectionTitle(doc, 'DESCRIÇÃO DO SERVIÇO', y)
  y += 5
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.dark)
  const descLines = doc.splitTextToSize(quote.description, pageW - margin * 2)
  doc.text(descLines, margin, y)
  ;(doc as DocWithTable).lastAutoTable = { finalY: y + descLines.length * 4.5 }

  // ─── Itens ────────────────────────────────────────────────
  if (quote.items?.length) {
    y = getY(doc) + 7
    sectionTitle(doc, 'PEÇAS / MATERIAIS', y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Item', 'Qtd', 'Preço Unit.', 'Total']],
      body: quote.items.map(item => [item.name, item.quantity.toString(), formatCurrency(item.unit_price), formatCurrency(item.total_price)]),
      theme: 'plain',
      headStyles: { fillColor: false, textColor: C.mid, fontStyle: 'bold', fontSize: 8, lineColor: C.light, lineWidth: 0.2 },
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: C.dark, lineWidth: 0 },
      columnStyles: {
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'right', cellWidth: 35 },
      },
      margin: { left: margin, right: margin },

    })
  }

  // ─── Totais ───────────────────────────────────────────────
  y = getY(doc) + 7
  sectionTitle(doc, 'VALORES', y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      ['Mão de obra', formatCurrency(quote.labor_value)],
      ['Peças / Materiais', formatCurrency(quote.parts_total)],
      ['TOTAL GERAL', formatCurrency(quote.total_value)],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2.5, textColor: C.dark, lineColor: C.ultralight, lineWidth: 0.15 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100, textColor: C.mid }, 1: { halign: 'right' } },
    didParseCell(data) {
      if (data.row.index === 2) {
        data.cell.styles.fontSize = 11
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.textColor = C.black
      }
    },
    margin: { left: margin, right: margin },
  })

  // ─── Observações ──────────────────────────────────────────
  if (quote.notes) {
    y = getY(doc) + 7
    sectionTitle(doc, 'OBSERVAÇÕES', y)
    y += 5
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.dark)
    const noteLines = doc.splitTextToSize(quote.notes, pageW - margin * 2)
    doc.text(noteLines, margin, y)
  }

  // ─── Rodapé ───────────────────────────────────────────────
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...C.light)
  doc.text('Este orçamento não tem valor fiscal.', 105, 287, { align: 'center' })
  doc.text(companyName, 105, 290, { align: 'center' })

  if (mode === 'download') {
    doc.save(`${quote.quote_number}.pdf`)
  } else {
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const w = window.open(url)
    w?.addEventListener('load', () => URL.revokeObjectURL(url))
  }
}