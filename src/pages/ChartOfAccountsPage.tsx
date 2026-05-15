import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { AccountType, AccountTypeLabel } from '../../shared/accounts'

export default function ChartOfAccountsPage() {
  const { id } = useParams<{ id: string }>()
  const bookId = Number(id)
  const { data: accounts, isLoading, refetch } = trpc.books.accounts.useQuery({ id: bookId })
  const updateAccounts = trpc.books.updateAccounts.useMutation()

  const [editing, setEditing] = useState(false)
  const [edits, setEdits] = useState<Record<number, string>>({})

  function enterEdit() {
    setEdits({})
    setEditing(true)
  }

  function cancelEdit() {
    setEdits({})
    setEditing(false)
  }

  async function saveEdit() {
    const updates = Object.entries(edits).map(([id, name]) => ({ id: Number(id), name }))
    if (updates.length > 0) {
      await updateAccounts.mutateAsync({ bookId, updates })
      refetch()
    }
    setEditing(false)
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
        return (
          <div key={type} className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{AccountTypeLabel[type]}</h2>
            <div className="mt-2">
              {group.map((a) => (
                <div key={a.id} className="py-1 pl-4">
                  {editing ? (
                    <input
                      className="w-full rounded border border-gray-300 px-2 py-0.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={edits[a.id] ?? a.name}
                      onChange={(e) => setEdits((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    />
                  ) : (
                    a.name
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
