import { supabase } from '../lib/supabase'
import { Attachment } from '../types'

export const attachmentsService = {
  async getByOrderId(orderId: string): Promise<Attachment[]> {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at')

    if (error) throw error
    return data || []
  },

  async upload(userId: string, orderId: string, file: File): Promise<Attachment> {
    const fileExt = file.name.split('.').pop()
    const storagePath = `${userId}/${orderId}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, file, { upsert: false })

    if (uploadError) throw uploadError

    const { data, error } = await supabase
      .from('attachments')
      .insert({
        order_id: orderId,
        user_id: userId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(attachment: Attachment): Promise<void> {
    await supabase.storage.from('attachments').remove([attachment.storage_path])

    const { error } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachment.id)

    if (error) throw error
  },

  getPublicUrl(storagePath: string): string {
    const { data } = supabase.storage.from('attachments').getPublicUrl(storagePath)
    return data.publicUrl
  },

  async getSignedUrl(storagePath: string, expiresIn = 60): Promise<string> {
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(storagePath, expiresIn)
    if (error) throw error
    return data.signedUrl
  },
}