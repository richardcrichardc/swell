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
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 border-b border-gray-200">
            <th className="pb-2 font-medium text-left w-24">Date</th>
            <th className="pb-2 font-medium text-left">Memo</th>
            <th className="pb-2 font-medium text-left w-px whitespace-nowrap">Account</th>
            <th className="pb-2 font-medium text-left w-px whitespace-nowrap">Type</th>
            <th className="pb-2 font-medium text-right w-24">Debit</th>
            <th className="pb-2 font-medium text-right w-24">Credit</th>
          </tr>
        </thead>
        <tbody>
          {transactions?.map((txn) => (
            <>
              <tr key={txn.id} className="border-t border-gray-200">
                <td className="pt-2 pb-0.5 pr-4 text-gray-500">{txn.date}</td>
                <td className="pt-2 pb-0.5 text-gray-900 font-medium" colSpan={5}>{txn.description}</td>
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
    </div>
  )
}
