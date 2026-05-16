import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { trpc } from '../lib/trpc'
import { AccountType, AccountTypeLabel } from '../../shared/accounts'

type EditItem = { key: string; id?: number; name: string; hasTransactions?: boolean }

function SortableItem({
  item,
  onNameChange,
  onDelete,
}: {
  item: EditItem
  onNameChange: (v: string) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const isEmpty = item.id == null && !item.name

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 py-1 pl-4">
      <span
        {...(!isEmpty ? { ...attributes, ...listeners } : {})}
        className={`select-none ${isEmpty ? 'text-transparent' : 'cursor-grab text-gray-300 hover:text-gray-500'}`}
      >
        ⠿
      </span>
      <input
        className="flex-1 rounded border border-gray-300 px-2 py-0.5 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={item.id == null ? 'New account' : undefined}
        value={item.name}
        onChange={(e) => onNameChange(e.target.value)}
      />
      {item.id != null && (
        <button
          onClick={onDelete}
          disabled={item.hasTransactions}
          title={item.hasTransactions ? 'Account has transactions' : 'Delete account'}
          className={`text-lg leading-none ${item.hasTransactions ? 'cursor-not-allowed text-gray-200' : 'text-red-400 hover:text-red-600'}`}
        >
          ×
        </button>
      )}
    </div>
  )
}

export default function ChartOfAccountsPage() {
  const { id } = useParams<{ id: string }>()
  const bookId = Number(id)
  const { data: accounts, isLoading, refetch } = trpc.books.accounts.useQuery({ id: bookId })
  const updateAccounts = trpc.books.updateAccounts.useMutation()

  const [editing, setEditing] = useState(false)
  const [editItems, setEditItems] = useState<Record<string, EditItem[]>>({})
  const [pendingDeletions, setPendingDeletions] = useState<number[]>([])
  const nextKey = useRef(0)

  const sensors = useSensors(useSensor(PointerSensor))

  function enterEdit() {
    if (!accounts) return
    const items: Record<string, EditItem[]> = {}
    for (const type of Object.values(AccountType)) {
      const group = accounts.filter((a) => a.type === type)
      items[type] = [
        ...group.map((a) => ({ key: String(a.id), id: a.id, name: a.name, hasTransactions: a.hasTransactions })),
        { key: `new-${nextKey.current++}`, name: '' },
      ]
    }
    setEditItems(items)
    setPendingDeletions([])
    setEditing(true)
  }

  function cancelEdit() {
    setEditItems({})
    setPendingDeletions([])
    setEditing(false)
  }

  async function saveEdit() {
    if (!accounts) return
    const updates = Object.entries(editItems).flatMap(([type, items]) =>
      items
        .filter((item) => item.name.trim())
        .map((item, i) =>
          item.id != null
            ? { id: item.id, name: item.name, sortOrder: i }
            : { type, name: item.name.trim(), sortOrder: i }
        )
    )
    await updateAccounts.mutateAsync({ bookId, updates, deletions: pendingDeletions })
    await refetch()
    setEditItems({})
    setPendingDeletions([])
    setEditing(false)
  }

  function handleNameChange(type: string, key: string, value: string) {
    setEditItems((prev) => {
      const items = [...prev[type]]
      const idx = items.findIndex((i) => i.key === key)
      items[idx] = { ...items[idx], name: value }
      if (idx === items.length - 1 && items[idx].id == null && value) {
        items.push({ key: `new-${nextKey.current++}`, name: '' })
      }
      return { ...prev, [type]: items }
    })
  }

  function handleDelete(type: string, key: string, id: number) {
    setPendingDeletions((prev) => [...prev, id])
    setEditItems((prev) => ({ ...prev, [type]: prev[type].filter((i) => i.key !== key) }))
  }

  function handleDragEnd(type: string, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setEditItems((prev) => {
      const items = prev[type]
      const oldIndex = items.findIndex((i) => i.key === String(active.id))
      const newIndex = items.findIndex((i) => i.key === String(over.id))
      return { ...prev, [type]: arrayMove(items, oldIndex, newIndex) }
    })
  }

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Chart of Accounts</h1>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={cancelEdit} className="rounded px-3 py-1.5 text-sm font-medium text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50">Cancel</button>
              <button onClick={saveEdit} className="rounded px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Save</button>
            </>
          ) : (
            <button onClick={enterEdit} className="rounded px-3 py-1.5 text-sm font-medium text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50">Edit</button>
          )}
        </div>
      </div>
      {Object.values(AccountType).map((type) => {
        const group = accounts?.filter((a) => a.type === type) ?? []
        if (!editing && group.length === 0) return null
        return (
          <div key={type} className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{AccountTypeLabel[type]}</h2>
            <div className="mt-2">
              {editing ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(type, e)}>
                  <SortableContext items={(editItems[type] ?? []).map((i) => i.key)} strategy={verticalListSortingStrategy}>
                    {(editItems[type] ?? []).map((item) => (
                      <SortableItem
                        key={item.key}
                        item={item}
                        onNameChange={(v) => handleNameChange(type, item.key, v)}
                        onDelete={() => item.id != null && handleDelete(type, item.key, item.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                group.map((a) => <div key={a.id} className="py-1 pl-4">{a.name}</div>)
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
