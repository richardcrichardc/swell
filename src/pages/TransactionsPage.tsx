import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import TransactionDialog from '../components/TransactionDialog'

function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2)
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(month) - 1]
  return `${Number(day)}-${monthName}-${year}`
}

export default function JournalPage() {
  const { id } = useParams<{ id: string }>()
  const bookId = Number(id)
  const { data: transactions, isLoading } = trpc.books.transactions.useQuery({ id: bookId })
  const [editingTxnId, setEditingTxnId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <button onClick={() => setCreating(true)} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          Add Transaction
        </button>
      </div>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 border-b border-gray-200">
            <th className="pb-2 font-medium text-left w-24">Date</th>
            <th className="pb-2 font-medium text-left">Memo</th>
            <th className="pb-2 font-medium text-left w-px whitespace-nowrap">Account</th>
            <th className="pb-2 font-medium text-left w-px whitespace-nowrap">Type</th>
            <th className="pb-2 font-medium text-right w-24">Debit</th>
            <th className="pb-2 font-medium text-right w-24">Credit</th>
            <th className="pb-2 font-medium text-left w-px whitespace-nowrap pl-6">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions?.map((txn) => (
            <>
              <tr key={txn.id} className="border-t border-gray-200">
                <td className="pt-2 pb-0.5 pr-4 text-gray-500">{formatDate(txn.date)}</td>
                <td className="pt-2 pb-0.5 text-gray-900 font-medium" colSpan={5}>{txn.description}</td>
                <td className="pt-2 pb-0.5 pl-6 align-top" rowSpan={txn.lines.length + 1}>
                  <button onClick={() => setEditingTxnId(txn.id)} className="inline-flex items-center rounded border border-gray-300 p-1 text-gray-500 hover:border-gray-400 hover:text-gray-700" title="Edit transaction">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                </td>
              </tr>
              {txn.lines.map((l) => (
                <tr key={l.id}>
                  <td />
                  <td className="py-0.5 pr-4 text-gray-500">{l.description}</td>
                  <td className="py-0.5 pr-4 text-gray-700 whitespace-nowrap">{l.accountName}</td>
                  <td className="py-0.5 pr-4 text-gray-500 whitespace-nowrap">{l.accountType}</td>
                  <td className="py-0.5 text-right tabular-nums">{l.debit != null ? formatAmount(l.debit) : ''}</td>
                  <td className="py-0.5 text-right tabular-nums">{l.credit != null ? formatAmount(l.credit) : ''}</td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
      {creating && (
        <TransactionDialog
          bookId={bookId}
          onSave={() => setCreating(false)}
          onClose={() => setCreating(false)}
        />
      )}
      {editingTxnId != null && (
        <TransactionDialog
          bookId={bookId}
          transactionId={editingTxnId}
          onSave={() => setEditingTxnId(null)}
          onClose={() => setEditingTxnId(null)}
        />
      )}
    </div>
  )
}
