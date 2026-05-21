import { useEffect, useState } from 'react'
import { trpc } from '../lib/trpc'
import { AccountType, AccountTypeLabel } from '../../../shared/accounts'
import { parseCents, formatCents } from '../../../shared/money'

type EditLine = {
  key: string
  id?: number
  accountId: number | null
  description: string
  debit: string
  credit: string
}

type Props = {
  bookId: number
  transactionId?: number
  onSave: () => void
  onClose: () => void
}

let nextKey = 0

export default function TransactionDialog({ bookId, transactionId, onSave, onClose }: Props) {
  const utils = trpc.useUtils()
  const { data: txn, isLoading: txnLoading } = trpc.books.getTransaction.useQuery(
    { bookId, transactionId: transactionId! },
    { enabled: transactionId != null },
  )
  const { data: accounts, isLoading: accountsLoading } = trpc.books.accounts.useQuery({ id: bookId })
  const updateTransaction = trpc.books.updateTransaction.useMutation({
    onSuccess: () => {
      void utils.books.journal.invalidate({ id: bookId })
      onSave()
    },
  })

  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(transactionId == null ? today : '')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<EditLine[]>(() =>
    transactionId == null
      ? [
          { key: `new-${nextKey++}`, accountId: null, description: '', debit: '', credit: '' },
          { key: `new-${nextKey++}`, accountId: null, description: '', debit: '', credit: '' },
        ]
      : [],
  )
  const [initialized, setInitialized] = useState(transactionId == null)

  useEffect(() => {
    if (txn && !initialized) {
      setDate(txn.date)
      setDescription(txn.description)
      setLines(txn.lines.map(l => ({
        key: String(l.id),
        id: l.id,
        accountId: l.accountId,
        description: l.description,
        debit: l.debit != null ? formatCents(l.debit) : '',
        credit: l.credit != null ? formatCents(l.credit) : '',
      })))
      setInitialized(true)
    }
  }, [txn, initialized])

  const totalDebitCents = lines.reduce((sum, l) => sum + parseCents(l.debit), 0)
  const totalCreditCents = lines.reduce((sum, l) => sum + parseCents(l.credit), 0)
  const balanced = totalDebitCents === totalCreditCents

  function updateLine(key: string, changes: Partial<EditLine>) {
    setLines(prev => prev.map(l => l.key === key ? { ...l, ...changes } : l))
  }

  function deleteLine(key: string) {
    setLines(prev => prev.filter(l => l.key !== key))
  }

  function addLine() {
    setLines(prev => [...prev, { key: `new-${nextKey++}`, accountId: null, description: '', debit: '', credit: '' }])
  }

  function handleSave() {
    updateTransaction.mutate({
      bookId,
      transactionId,
      date,
      description,
      lines: lines.map(l => ({
        id: l.id,
        accountId: l.accountId!,
        description: l.description,
        amount: parseCents(l.debit) - parseCents(l.credit),
      })),
    })
  }

  const isLoading = (transactionId != null && txnLoading) || accountsLoading

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-gray-900">{transactionId == null ? 'New Transaction' : 'Edit Transaction'}</h2>

        {isLoading ? (
          <p className="mt-6 text-sm text-gray-500">Loading…</p>
        ) : (
          <>
            <div className="mt-4 flex gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <table className="mt-6 w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-200">
                  <th className="pb-2 font-medium text-left">Account</th>
                  <th className="pb-2 font-medium text-left">Memo</th>
                  <th className="pb-2 font-medium text-right w-24">Debit</th>
                  <th className="pb-2 font-medium text-right w-24">Credit</th>
                  <th className="pb-2 w-6" />
                </tr>
              </thead>
              <tbody>
                {lines.map(l => (
                  <tr key={l.key}>
                    <td className="py-1 pr-2">
                      <select
                        value={l.accountId ?? ''}
                        onChange={e => updateLine(l.key, { accountId: e.target.value ? Number(e.target.value) : null })}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">— select —</option>
                        {Object.values(AccountType).map(type => {
                          const group = accounts?.filter(a => a.type === type) ?? []
                          if (group.length === 0) return null
                          return (
                            <optgroup key={type} label={AccountTypeLabel[type]}>
                              {group.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </optgroup>
                          )
                        })}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="text"
                        value={l.description}
                        onChange={e => updateLine(l.key, { description: e.target.value })}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.debit}
                        onChange={e => updateLine(l.key, { debit: e.target.value, credit: '' })}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.credit}
                        onChange={e => updateLine(l.key, { credit: e.target.value, debit: '' })}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-1 text-center">
                      <button onClick={() => deleteLine(l.key)} className="text-gray-300 hover:text-red-500">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 flex items-center justify-between">
              <button onClick={addLine} className="text-sm text-blue-600 hover:text-blue-700">+ Add line</button>
              <span className={`text-xs ${balanced ? 'text-green-600' : 'text-red-500'}`}>
                {balanced ? 'Balanced' : `Out of balance by ${formatCents(Math.abs(totalDebitCents - totalCreditCents))}`}
              </span>
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !balanced || updateTransaction.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
