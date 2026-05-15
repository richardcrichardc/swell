import { useState } from 'react'
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

type Account = { id: number; name: string; type: string; sortOrder: number }

function SortableAccount({
  account,
  editing,
  name,
  onNameChange,
}: {
  account: Account
  editing: boolean
  name: string
  onNameChange: (name: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: account.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 py-1 pl-4">
      {editing && (
        <span {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500 select-none">
          ⠿
        </span>
      )}
      {editing ? (
        <input
          className="flex-1 rounded border border-gray-300 px-2 py-0.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      ) : (
        <span>{name}</span>
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
  const [editNames, setEditNames] = useState<Record<number, string>>({})
  const [editOrder, setEditOrder] = useState<Record<string, number[]>>({})

  const sensors = useSensors(useSensor(PointerSensor))

  function enterEdit() {
    if (!accounts) return
    setEditNames({})
    const order: Record<string, number[]> = {}
    for (const type of Object.values(AccountType)) {
      order[type] = accounts.filter((a) => a.type === type).map((a) => a.id)
    }
    setEditOrder(order)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
  }

  async function saveEdit() {
    if (!accounts) return
    const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]))
    const updates = Object.entries(editOrder).flatMap(([, ids]) =>
      ids.map((id, i) => ({
        id,
        name: editNames[id] ?? accountById[id].name,
        sortOrder: i,
      }))
    )
    await updateAccounts.mutateAsync({ bookId, updates })
    await refetch()
    setEditing(false)
  }

  function handleDragEnd(type: string, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setEditOrder((prev) => {
      const ids = prev[type] ?? []
      const oldIndex = ids.indexOf(Number(active.id))
      const newIndex = ids.indexOf(Number(over.id))
      return { ...prev, [type]: arrayMove(ids, oldIndex, newIndex) }
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
        if (group.length === 0) return null
        const orderedIds = editOrder[type] ?? group.map((a) => a.id)
        const accountById = Object.fromEntries(group.map((a) => [a.id, a]))
        const orderedAccounts = orderedIds.map((id) => accountById[id]).filter(Boolean)

        return (
          <div key={type} className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{AccountTypeLabel[type]}</h2>
            <div className="mt-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(type, e)}>
                <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                  {orderedAccounts.map((a) => (
                    <SortableAccount
                      key={a.id}
                      account={a}
                      editing={editing}
                      name={editNames[a.id] ?? a.name}
                      onNameChange={(name) => setEditNames((prev) => ({ ...prev, [a.id]: name }))}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )
      })}
    </div>
  )
}
