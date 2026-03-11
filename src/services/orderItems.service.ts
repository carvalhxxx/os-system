import { supabase } from '../lib/supabase'
import { OrderItem, OrderItemInsert } from '../types'

export const orderItemsService = {
  async getByOrderId(orderId: string): Promise<OrderItem[]> {
    const { data, error } = await supabase
      .from('order_items')
      .select('*, part:parts(id, name, code)')
      .eq('order_id', orderId)
      .order('created_at')
    if (error) throw error
    return (data || []) as OrderItem[]
  },

  async addItem(item: OrderItemInsert): Promise<OrderItem> {
    const total_price = item.quantity * item.unit_price
    const { data, error } = await supabase
      .from('order_items')
      .insert({ ...item, total_price })
      .select('*, part:parts(id, name, code)')
      .single()
    if (error) throw error
    return data as OrderItem
  },

  async updateItem(
    id: string,
    quantity: number,
    unit_price: number
  ): Promise<OrderItem> {
    const total_price = quantity * unit_price
    const { data, error } = await supabase
      .from('order_items')
      .update({ quantity, unit_price, total_price })
      .eq('id', id)
      .select('*, part:parts(id, name, code)')
      .single()
    if (error) throw error
    return data as OrderItem
  },

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase.from('order_items').delete().eq('id', id)
    if (error) throw error
  },

  // Recalcula e salva o service_value da OS com base nos itens + mão de obra
  async syncOrderTotal(
    orderId: string,
    laborValue: number
  ): Promise<void> {
    // Soma todos os itens
    const { data, error } = await supabase
      .from('order_items')
      .select('total_price')
      .eq('order_id', orderId)
    if (error) throw error

    const partsTotal = (data || []).reduce(
      (sum, item) => sum + (item.total_price || 0),
      0
    )

    const serviceValue = partsTotal + laborValue

    const { error: updateError } = await supabase
      .from('service_orders')
      .update({
        service_value: serviceValue,
        parts_total: partsTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) throw updateError
  },
}
