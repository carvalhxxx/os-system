// ─── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  created_at: string
}

// ─── Company Settings ─────────────────────────────────────────────────────────
export interface CompanySettings {
  id: string
  user_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  document: string | null
  website: string | null
  logo_url: string | null
  created_at: string
  updated_at: string
}

export type CompanySettingsUpsert = Omit<CompanySettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>

// ─── Client ──────────────────────────────────────────────────────────────────
export interface Client {
  id: string
  user_id: string
  name: string
  phone: string
  email: string | null
  document: string // CPF ou CNPJ
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ClientInsert = Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type ClientUpdate = Partial<ClientInsert>

// ─── Technician ──────────────────────────────────────────────────────────────
export interface Technician {
  id: string
  user_id: string
  name: string
  phone: string
  specialty: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export type TechnicianInsert = Omit<Technician, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type TechnicianUpdate = Partial<TechnicianInsert>

// ─── Service Order ────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'aberta'
  | 'em_andamento'
  | 'aguardando_peca'
  | 'finalizada'
  | 'cancelada'

export interface ServiceOrder {
  id: string
  user_id: string
  order_number: string
  client_id: string
  technician_id: string | null
  problem_description: string
  diagnosis: string | null
  service_performed: string | null
  service_value: number
  labor_value: number
  parts_total: number
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  payment_date: string | null
  amount_paid: number
  payment_notes: string | null
  status: OrderStatus
  opened_at: string
  closed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Relations
  client?: Client
  technician?: Technician
  attachments?: Attachment[]
  order_items?: OrderItem[]
}

export type ServiceOrderInsert = {
  client_id: string
  technician_id: string | null
  problem_description: string
  diagnosis?: string | null
  service_performed?: string | null
  service_value: number
  labor_value?: number
  parts_total?: number
  payment_status?: PaymentStatus
  payment_method?: PaymentMethod | null
  payment_date?: string | null
  amount_paid?: number
  payment_notes?: string | null
  status: OrderStatus
  opened_at: string
  closed_at?: string | null
  notes?: string | null
}
export type ServiceOrderUpdate = Partial<ServiceOrderInsert>

// ─── Attachment ───────────────────────────────────────────────────────────────
export interface Attachment {
  id: string
  order_id: string
  user_id: string
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  created_at: string
}

// ─── Part (Catálogo de Peças) ─────────────────────────────────────────────────
export interface Part {
  id: string
  user_id: string
  code: string | null       // Código/referência
  name: string
  unit_price: number
  stock_qty: number | null  // opcional, para futuro controle de estoque
  notes: string | null
  created_at: string
  updated_at: string
}

export type PartInsert = Omit<Part, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type PartUpdate = Partial<PartInsert>

// ─── Order Item (Peças usadas na OS) ─────────────────────────────────────────
export interface OrderItem {
  id: string
  order_id: string
  part_id: string
  quantity: number
  unit_price: number        // preço no momento do uso (snapshot)
  total_price: number       // quantity * unit_price
  created_at: string
  // Relations
  part?: Part
}

export type OrderItemInsert = Omit<OrderItem, 'id' | 'total_price' | 'created_at' | 'part'>

// ─── Pagamento ────────────────────────────────────────────────────────────────
export type PaymentStatus = 'pendente' | 'pago' | 'pago_parcial'

export type PaymentMethod =
  | 'dinheiro'
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'transferencia'
  | 'boleto'
  | 'outro'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro:       'Dinheiro',
  pix:            'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito:  'Cartão de Débito',
  transferencia:  'Transferência',
  boleto:         'Boleto',
  outro:          'Outro',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pendente:    'Pendente',
  pago:        'Pago',
  pago_parcial:'Parcial',
}

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pendente:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  pago:        'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  pago_parcial:'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  total_open: number
  total_in_progress: number
  total_finished: number
  total_revenue: number
  total_receivable: number
}

// ─── Filters ──────────────────────────────────────────────────────────────────
export interface OrderFilters {
  status?: OrderStatus | ''
  client_id?: string
  date_from?: string
  date_to?: string
  search?: string
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}
