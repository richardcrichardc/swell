import { useParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'

export default function ChartOfAccountsPage() {
  const { id } = useParams<{ id: string }>()
  const bookId = Number(id)
  const { data: accounts, isLoading } = trpc.books.accounts.useQuery({ id: bookId })

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Group</th>
            <th className="pb-2 font-medium">Type</th>
          </tr>
        </thead>
        <tbody>
          {accounts?.map((a) => (
            <tr key={a.id} className="border-b border-gray-100">
              <td className="py-2">{a.name}</td>
              <td className="py-2 text-gray-600">{a.group}</td>
              <td className="py-2 text-gray-600">{a.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
