import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Send, Pencil, Trash2, Check, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { orderNotesService, OrderNote } from '../services/orderNotes.service'
import { formatDateTime } from '../lib/utils'
import { ConfirmDialog, Spinner } from './ui'
import toast from 'react-hot-toast'

interface OrderNotesPanelProps {
  orderId: string
}

function NoteItem({
  note,
  isOwn,
  onUpdate,
  onDelete,
}: {
  note: OrderNote
  isOwn: boolean
  onUpdate: (id: string, content: string) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(note.content)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const edited = note.updated_at !== note.created_at

  const save = () => {
    if (!content.trim()) return
    onUpdate(note.id, content.trim())
    setEditing(false)
  }

  const cancel = () => {
    setContent(note.content)
    setEditing(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              {note.author[0].toUpperCase()}
            </span>
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">{note.author}</span>
          <span className="text-xs text-gray-400 dark:text-slate-500">
            {formatDateTime(note.created_at)}
            {edited && <span className="ml-1 italic">(editado)</span>}
          </span>
        </div>
        {isOwn && !editing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="p-1 rounded text-gray-400 hover:text-blue-600 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="ml-8 space-y-2">
          <textarea
            autoFocus
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={3}
            className="input-field resize-none text-sm w-full"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={cancel} className="btn-secondary text-xs py-1 px-3">
              <X className="w-3 h-3" /> Cancelar
            </button>
            <button onClick={save} disabled={!content.trim()} className="btn-primary text-xs py-1 px-3">
              <Check className="w-3 h-3" /> Salvar
            </button>
          </div>
        </div>
      ) : (
        <p className="ml-8 text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
          {note.content}
        </p>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { onDelete(note.id); setConfirmDelete(false) }}
        title="Excluir Nota"
        message="Tem certeza que deseja excluir esta nota?"
        confirmLabel="Excluir"
      />
    </div>
  )
}

export function OrderNotesPanel({ orderId }: OrderNotesPanelProps) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [newNote, setNewNote] = useState('')

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['order-notes', orderId],
    queryFn: () => orderNotesService.getByOrderId(orderId),
    enabled: !!orderId,
  })

  const authorName = user?.email?.split('@')[0] || 'Usuário'

  const createMutation = useMutation({
    mutationFn: (content: string) =>
      orderNotesService.create(orderId, user!.id, authorName, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order-notes', orderId] })
      setNewNote('')
      toast.success('Nota adicionada!')
    },
    onError: () => toast.error('Erro ao adicionar nota'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      orderNotesService.update(id, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order-notes', orderId] })
      toast.success('Nota atualizada!')
    },
    onError: () => toast.error('Erro ao atualizar nota'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => orderNotesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order-notes', orderId] })
      toast.success('Nota removida!')
    },
    onError: () => toast.error('Erro ao remover nota'),
  })

  const handleSubmit = () => {
    const trimmed = newNote.trim()
    if (!trimmed) return
    createMutation.mutate(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <MessageSquare className="w-4 h-4 text-gray-500 dark:text-slate-400" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
          Notas Internas
        </h3>
        {notes.length > 0 && (
          <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-full">
            {notes.length}
          </span>
        )}
      </div>

      {/* Lista de notas */}
      <div className="px-6 py-4 space-y-5">
        {isLoading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
            Nenhuma nota ainda
          </p>
        ) : (
          notes.map(note => (
            <div key={note.id} className="group">
              <NoteItem
                note={note}
                isOwn={note.user_id === user?.id}
                onUpdate={(id, content) => updateMutation.mutate({ id, content })}
                onDelete={id => deleteMutation.mutate(id)}
              />
            </div>
          ))
        )}
      </div>

      {/* Input nova nota */}
      <div className="px-6 pb-5 border-t border-gray-100 dark:border-slate-800 pt-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Adicionar nota interna... (Ctrl+Enter para enviar)"
              className="input-field resize-none text-sm w-full"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!newNote.trim() || createMutation.isPending}
            className="btn-primary shrink-0 self-end"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
