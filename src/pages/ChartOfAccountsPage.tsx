import { useParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { AccountType, AccountTypeLabel } from '../../shared/accounts'

export default function ChartOfAccountsPage() {
  const { id } = useParams<{ id: string }>()
  const bookId = Number(id)
  const { data: accounts, isLoading } = trpc.books.accounts.useQuery({ id: bookId })

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
      {Object.values(AccountType).map((type) => {
        const group = accounts?.filter((a) => a.type === type) ?? []
        if (group.length === 0) return null
        return (
          <div key={type} className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{AccountTypeLabel[type]}</h2>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {group.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100">
                    <td className="py-2">{a.name}</td>
                    <td className="py-2 text-gray-600">{a.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
