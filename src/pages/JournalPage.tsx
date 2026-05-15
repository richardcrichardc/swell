import { useParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'

function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2)
}

export default function JournalPage() {
  const { id } = useParams<{ id: string }>()
  const bookId = Number(id)
  const { data: transactions, isLoading } = trpc.books.journal.useQuery({ id: bookId })

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Journal</h1>
      <div className="mt-6 space-y-6">
        {transactions?.map((txn) => (
          <div key={txn.id} className="border-b border-gray-200 pb-4">
            <div className="flex items-baseline gap-4">
              <span className="text-sm text-gray-500">{txn.date}</span>
              <span className="font-medium text-gray-900">{txn.description}</span>
            </div>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-gray-400">
                  <th className="pb-1 font-medium text-left"></th>
                  <th className="pb-1 font-medium text-left"></th>
                  <th className="pb-1 font-medium w-24">Debit</th>
                  <th className="pb-1 font-medium w-24">Credit</th>
                </tr>
              </thead>
              <tbody>
                {txn.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="py-0.5 text-gray-700">{l.accountName}</td>
                    <td className="py-0.5 text-gray-500">{l.description}</td>
                    <td className="py-0.5 text-right tabular-nums">{l.debit != null ? formatAmount(l.debit) : ''}</td>
                    <td className="py-0.5 text-right tabular-nums">{l.credit != null ? formatAmount(l.credit) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
