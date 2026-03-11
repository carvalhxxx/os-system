import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ServiceOrder, OrderItem, CompanySettings } from '../types'
import { formatCurrency, formatDate, formatDateTime, STATUS_LABELS } from './utils'

type DocWithTable = jsPDF & { lastAutoTable: { finalY: number } }

function getY(doc: jsPDF): number {
  return (doc as DocWithTable).lastAutoTable?.finalY ?? 0
}

export function exportOrderToPDF(
  order: ServiceOrder,
  items: OrderItem[] = [],
  mode: 'download' | 'print' = 'download',
  company?: Partial<CompanySettings> | null,
): void {
  const doc = new jsPDF()
  const companyName = company?.name || 'OS Manager'

  // ─── Header ──────────────────────────────────────────────
  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, 210, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(companyName.toUpperCase(), 14, 13)

  // Dados da empresa abaixo do nome
  const companyLines: string[] = []
  if (company?.phone || company?.email)
    companyLines.push([company.phone, company.email].filter(Boolean).join('  |  '))
  if (company?.address || company?.city)
    companyLines.push([company.address, company.city, company.state].filter(Boolean).join(', '))
  if (company?.document)
    companyLines.push(`CNPJ: ${company.document}`)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  companyLines.forEach((line, i) => {
    doc.text(line, 14, 19 + i * 4.5)
  })

  // Número da OS e data à direita
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(order.order_number, 196, 13, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Emitido em: ${formatDateTime(new Date().toISOString())}`, 196, 19, { align: 'right' })

  // ─── Status ───────────────────────────────────────────────
  doc.setTextColor(37, 99, 235)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`Status: ${STATUS_LABELS[order.status]}`, 14, 44)

  // ─── Dados do cliente ─────────────────────────────────────
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.text('DADOS DO CLIENTE', 14, 52)

  if (order.client) {
    autoTable(doc, {
      startY: 55,
      head: [],
      body: [
        ['Nome', order.client.name, 'Documento', order.client.document],
        ['Telefone', order.client.phone, 'Email', order.client.email || '—'],
        [
          'Endereço',
          [order.client.address, order.client.city, order.client.state]
            .filter(Boolean).join(', ') || '—',
          '', '',
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [243, 244, 246], cellWidth: 28 },
        2: { fontStyle: 'bold', fillColor: [243, 244, 246], cellWidth: 28 },
      },
      margin: { left: 14, right: 14 },
    })
  }

  // ─── Detalhes da OS ───────────────────────────────────────
  let y = getY(doc) + 8
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('DETALHES DA ORDEM', 14, y)

  autoTable(doc, {
    startY: y + 3,
    head: [],
    body: [
      ['Técnico', order.technician?.name || 'Não atribuído', 'Abertura', formatDate(order.opened_at)],
      ['Mão de Obra', formatCurrency(order.labor_value ?? 0), 'Conclusão', formatDate(order.closed_at)],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [243, 244, 246], cellWidth: 32 },
      2: { fontStyle: 'bold', fillColor: [243, 244, 246], cellWidth: 32 },
    },
    margin: { left: 14, right: 14 },
  })

  // ─── Peças e materiais ────────────────────────────────────
  if (items.length > 0) {
    y = getY(doc) + 8
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('PEÇAS E MATERIAIS', 14, y)

    const partsBody = items.map(item => [
      item.part?.code || '—',
      item.part?.name || '—',
      String(item.quantity),
      formatCurrency(item.unit_price),
      formatCurrency(item.total_price),
    ])

    const partsTotal = items.reduce((sum, i) => sum + i.total_price, 0)
    const laborValue = order.labor_value ?? 0
    const grandTotal = partsTotal + laborValue

    autoTable(doc, {
      startY: y + 3,
      head: [['Código', 'Descrição', 'Qtd', 'Vlr. Unit.', 'Subtotal']],
      body: partsBody,
      foot: [
        [
          { content: 'Mão de obra', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [249, 250, 251] } },
          { content: formatCurrency(laborValue), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        ],
        [
          { content: 'Total peças', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [249, 250, 251] } },
          { content: formatCurrency(partsTotal), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        ],
        [
          {
            content: 'TOTAL GERAL',
            colSpan: 4,
            styles: { halign: 'right', fontStyle: 'bold', fillColor: [37, 99, 235], textColor: [255, 255, 255] },
          },
          {
            content: formatCurrency(grandTotal),
            styles: { fontStyle: 'bold', fillColor: [37, 99, 235], textColor: [255, 255, 255] },
          },
        ],
      ],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      footStyles: { fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 25 },
        2: { halign: 'center', cellWidth: 14 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 28 },
      },
      margin: { left: 14, right: 14 },
    })
  } else {
    // Sem peças: exibe apenas o valor total
    y = getY(doc) + 8
    autoTable(doc, {
      startY: y,
      head: [],
      body: [
        [
          {
            content: `VALOR TOTAL: ${formatCurrency(order.service_value)}`,
            styles: {
              halign: 'right',
              fontStyle: 'bold',
              fontSize: 11,
              fillColor: [37, 99, 235],
              textColor: [255, 255, 255],
            },
          },
        ],
      ],
      theme: 'plain',
      margin: { left: 14, right: 14 },
    })
  }

  // ─── Seções de texto ──────────────────────────────────────
  y = getY(doc) + 8

  const sections = [
    { title: 'DESCRIÇÃO DO PROBLEMA', text: order.problem_description },
    { title: 'DIAGNÓSTICO',           text: order.diagnosis },
    { title: 'SERVIÇO REALIZADO',     text: order.service_performed },
    { title: 'OBSERVAÇÕES',           text: order.notes },
  ]

  for (const section of sections) {
    if (!section.text) continue

    if (y > 250) { doc.addPage(); y = 20 }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(section.title, 14, y)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 50)
    const lines = doc.splitTextToSize(section.text, 182)
    doc.text(lines, 14, y + 5)
    y = y + 5 + lines.length * 4.5 + 7
  }

  // ─── Assinaturas ─────────────────────────────────────────
  if (y > 255) { doc.addPage(); y = 20 }

  y += 10
  doc.setDrawColor(180, 180, 180)
  doc.line(14, y, 90, y)
  doc.line(120, y, 196, y)
  doc.setFontSize(8)
  doc.setTextColor(130, 130, 130)
  doc.text('Assinatura do Cliente', 52, y + 5, { align: 'center' })
  doc.text('Assinatura do Técnico', 158, y + 5, { align: 'center' })

  // ─── Rodapé em todas as páginas ───────────────────────────
  const pageCount = (doc as jsPDF & { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text(companyName, 105, 290, { align: 'center' })
    doc.text(`Página ${i} de ${pageCount}`, 196, 290, { align: 'right' })
  }

  if (mode === 'print') {
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) {
      win.onload = () => {
        win.focus()
        win.print()
        // Libera o blob após um tempo para o navegador processar
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      }
    }
  } else {
    doc.save(`${order.order_number}.pdf`)
  }
}
