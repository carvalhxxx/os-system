import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: import('../types').Client
        Insert: import('../types').ClientInsert & { user_id: string }
        Update: import('../types').ClientUpdate
      }
      technicians: {
        Row: import('../types').Technician
        Insert: import('../types').TechnicianInsert & { user_id: string }
        Update: import('../types').TechnicianUpdate
      }
      service_orders: {
        Row: import('../types').ServiceOrder
        Insert: import('../types').ServiceOrderInsert & { user_id: string; order_number: string }
        Update: import('../types').ServiceOrderUpdate
      }
      attachments: {
        Row: import('../types').Attachment
        Insert: Omit<import('../types').Attachment, 'id' | 'created_at'>
        Update: Partial<Omit<import('../types').Attachment, 'id' | 'created_at'>>
      }
    }
  }
}
