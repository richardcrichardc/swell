import { useParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'

function formatAmount(cents: number): string {
  const abs = Math.abs(cents)
  const str = (abs / 100).toFixed(2)
  return cents < 0 ? `(${str})` : str
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
              <tbody>
                {txn.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="py-0.5 text-gray-700">{l.accountName}</td>
                    <td className="py-0.5 text-gray-600">{l.description}</td>
                    <td className="py-0.5 text-right tabular-nums">{formatAmount(l.amount)}</td>
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
