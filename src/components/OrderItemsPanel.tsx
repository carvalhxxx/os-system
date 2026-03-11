import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Search, Package, Pencil, Check, X } from 'lucide-react'
import { useAuth } from '.././hooks/useAuth'
import { partsService } from '.././services/parts.service'
import { orderItemsService } from '.././services/orderItems.service'
import { OrderItem, Part } from '.././types'
import { formatCurrency } from '.././lib/utils'
import { Spinner } from './ui'
import toast from 'react-hot-toast'

interface OrderItemsProps {
  orderId: string
  laborValue: number             // mão de obra atual
  onTotalChange: (total: number) => void  // callback para atualizar o pai
  readOnly?: boolean
}

// ─── Linha editável de item ────────────────────────────────
function ItemRow({
  item,
  onDelete,
  onUpdate,
  readOnly,
}: {
  item: OrderItem
  onDelete: (id: string) => void
  onUpdate: (id: string, qty: number, price: number) => void
  readOnly?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [qty, setQty] = useState(item.quantity)
  const [price, setPrice] = useState(item.unit_price)

  const save = () => {
    if (qty <= 0) return
    onUpdate(item.id, qty, price)
    setEditing(false)
  }

  const cancel = () => {
    setQty(item.quantity)
    setPrice(item.unit_price)
    setEditing(false)
  }

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
      {/* Peça */}
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {item.part?.name ?? '—'}
          </p>
          {item.part?.code && (
            <span className="font-mono text-xs text-gray-400 dark:text-slate-500">
              {item.part.code}
            </span>
          )}
        </div>
      </td>

      {/* Quantidade */}
      <td className="px-4 py-3 w-28">
        {editing ? (
          <input
            type="number"
            min={1}
            value={qty}
            onChange={e => setQty(Number(e.target.value))}
            className="input-field w-20 text-center py-1 text-sm"
          />
        ) : (
          <span className="text-sm text-gray-700 dark:text-slate-300">{item.quantity}</span>
        )}
      </td>

      {/* Valor unitário */}
      <td className="px-4 py-3 w-36">
        {editing ? (
          <input
            type="number"
            min={0}
            step={0.01}
            value={price}
            onChange={e => setPrice(Number(e.target.value))}
            className="input-field w-28 py-1 text-sm"
          />
        ) : (
          <span className="text-sm text-gray-700 dark:text-slate-300">
            {formatCurrency(item.unit_price)}
          </span>
        )}
      </td>

      {/* Total da linha */}
      <td className="px-4 py-3 w-32 text-right">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatCurrency(editing ? qty * price : item.total_price)}
        </span>
      </td>

      {/* Ações */}
      {!readOnly && (
        <td className="px-4 py-3 w-20 text-right">
          {editing ? (
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={save}
                className="p-1.5 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                title="Salvar"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={cancel}
                className="p-1.5 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title="Editar"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Remover"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </td>
      )}
    </tr>
  )
}

// ─── Seletor de peça do catálogo ───────────────────────────
function PartSelector({
  parts,
  onSelect,
  onClose,
}: {
  parts: Part[]
  onSelect: (part: Part, qty: number) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Part | null>(null)
  const [qty, setQty] = useState(1)

  const filtered = parts.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.code ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const confirm = () => {
    if (!selected || qty <= 0) return
    onSelect(selected, qty)
  }

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          autoFocus
          type="text"
          placeholder="Buscar peça por nome ou código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      {/* Lista de peças */}
      <div className="max-h-64 overflow-y-auto scrollbar-thin border border-gray-200 dark:border-slate-700 rounded-lg divide-y divide-gray-100 dark:divide-slate-700">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">
            Nenhuma peça encontrada
          </div>
        ) : (
          filtered.map(part => (
            <button
              key={part.id}
              onClick={() => setSelected(part)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                selected?.id === part.id
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              <div>
                <p className={`text-sm font-medium ${
                  selected?.id === part.id
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-800 dark:text-slate-200'
                }`}>
                  {part.name}
                </p>
                {part.code && (
                  <span className="font-mono text-xs text-gray-400 dark:text-slate-500">
                    {part.code}
                  </span>
                )}
              </div>
              <span className={`text-sm font-semibold ml-4 shrink-0 ${
                selected?.id === part.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-slate-400'
              }`}>
                {formatCurrency(part.unit_price)}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Quantidade + confirmar */}
      {selected && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
            {selected.name}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="label text-xs">Quantidade</label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={e => setQty(Number(e.target.value))}
                className="input-field w-24"
              />
            </div>
            <div className="flex-1">
              <label className="label text-xs">Subtotal</label>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1.5">
                {formatCurrency(selected.unit_price * qty)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-slate-700">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          disabled={!selected || qty <= 0}
          className="btn-primary"
          onClick={confirm}
        >
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────
export function OrderItemsPanel({
  orderId,
  laborValue,
  onTotalChange,
  readOnly = false,
}: OrderItemsProps) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [showSelector, setShowSelector] = useState(false)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['order-items', orderId],
    queryFn: () => orderItemsService.getByOrderId(orderId),
    enabled: !!orderId,
  })

  const { data: parts = [] } = useQuery({
    queryKey: ['parts', user?.id],
    queryFn: () => partsService.getAll(user!.id),
    enabled: !!user && !readOnly,
  })

  const partsTotal = items.reduce((sum, i) => sum + i.total_price, 0)
  const grandTotal = partsTotal + laborValue

  // Sincroniza o total na OS após qualquer mudança nos itens
  const invalidateAndSync = async () => {
    // 1. Recarrega os itens atualizados
    await qc.invalidateQueries({ queryKey: ['order-items', orderId] })
    const updatedItems = await qc.fetchQuery({
      queryKey: ['order-items', orderId],
      queryFn: () => orderItemsService.getByOrderId(orderId),
    })

    // 2. Calcula o novo total com os itens frescos
    const newPartsTotal = updatedItems.reduce((sum, i) => sum + i.total_price, 0)
    const newGrandTotal = newPartsTotal + laborValue

    // 3. Salva na OS e invalida queries dependentes
    await orderItemsService.syncOrderTotal(orderId, laborValue)
    await qc.invalidateQueries({ queryKey: ['order', orderId] })
    await qc.invalidateQueries({ queryKey: ['orders'] })
    await qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    onTotalChange(newGrandTotal)
  }

  const addMutation = useMutation({
    mutationFn: ({ part, qty }: { part: Part; qty: number }) =>
      orderItemsService.addItem({
        order_id: orderId,
        part_id: part.id,
        quantity: qty,
        unit_price: part.unit_price,
      }),
    onSuccess: () => {
      invalidateAndSync()
      setShowSelector(false)
      toast.success('Peça adicionada!')
    },
    onError: () => toast.error('Erro ao adicionar peça'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, qty, price }: { id: string; qty: number; price: number }) =>
      orderItemsService.updateItem(id, qty, price),
    onSuccess: () => {
      invalidateAndSync()
      toast.success('Item atualizado!')
    },
    onError: () => toast.error('Erro ao atualizar item'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => orderItemsService.deleteItem(id),
    onSuccess: () => {
      invalidateAndSync()
      toast.success('Item removido!')
    },
    onError: () => toast.error('Erro ao remover item'),
  })

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-500 dark:text-slate-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
            Peças e Materiais
          </h3>
          {items.length > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>
        {!readOnly && !showSelector && (
          <button
            className="btn-secondary text-sm"
            onClick={() => setShowSelector(true)}
          >
            <Plus className="w-4 h-4" /> Adicionar Peça
          </button>
        )}
      </div>

      {/* Seletor de peça */}
      {showSelector && !readOnly && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            Selecionar do catálogo
          </p>
          <PartSelector
            parts={parts}
            onSelect={(part, qty) => addMutation.mutate({ part, qty })}
            onClose={() => setShowSelector(false)}
          />
        </div>
      )}

      {/* Tabela de itens */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner />
        </div>
      ) : items.length === 0 && !showSelector ? (
        <div className="py-10 text-center">
          <Package className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400 dark:text-slate-500">Nenhuma peça adicionada</p>
          {!readOnly && (
            <button
              className="text-xs text-blue-600 mt-1 hover:underline"
              onClick={() => setShowSelector(true)}
            >
              Adicionar do catálogo
            </button>
          )}
        </div>
      ) : items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800">
                <th className="table-header">Peça / Material</th>
                <th className="table-header">Qtd</th>
                <th className="table-header">Vlr. Unit.</th>
                <th className="table-header text-right">Subtotal</th>
                {!readOnly && <th className="table-header text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {items.map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  readOnly={readOnly}
                  onDelete={id => deleteMutation.mutate(id)}
                  onUpdate={(id, qty, price) =>
                    updateMutation.mutate({ id, qty, price })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Totalizador */}
      {items.length > 0 && (
        <div className="border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 px-6 py-4">
          <div className="flex flex-col items-end gap-1.5 text-sm">
            <div className="flex items-center gap-8 text-gray-600 dark:text-slate-400">
              <span>Peças e materiais</span>
              <span className="font-medium w-28 text-right">
                {formatCurrency(partsTotal)}
              </span>
            </div>
            <div className="flex items-center gap-8 text-gray-600 dark:text-slate-400">
              <span>Mão de obra</span>
              <span className="font-medium w-28 text-right">
                {formatCurrency(laborValue)}
              </span>
            </div>
            <div className="flex items-center gap-8 pt-2 border-t border-gray-200 dark:border-slate-700 w-64">
              <span className="font-bold text-gray-900 dark:text-white text-base">Total</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 text-lg w-28 text-right">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
