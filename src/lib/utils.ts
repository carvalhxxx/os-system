import { type ClassValue } from 'clsx'
import { OrderStatus } from '../types'

// Tailwind class merging (install clsx + tailwind-merge if desired, or use simple version)
export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ')
}

// Currency formatting
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Date formatting
export function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Status labels and colors
export const STATUS_LABELS: Record<OrderStatus, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  aguardando_peca: 'Aguardando Peça',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  aberta: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  em_andamento: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  aguardando_peca: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  finalizada: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  cancelada: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export const STATUS_DOT: Record<OrderStatus, string> = {
  aberta: 'bg-blue-500',
  em_andamento: 'bg-amber-500',
  aguardando_peca: 'bg-purple-500',
  finalizada: 'bg-green-500',
  cancelada: 'bg-red-500',
}

// Document mask
export function maskDocument(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}

// File size formatting
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Generate OS number
export function generateOrderNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const random = Math.floor(Math.random() * 9000) + 1000
  return `OS-${year}-${random}`
}

export { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../types'

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
