import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { keepPreviousData } from '@tanstack/react-query'
import { trpc } from '../lib/trpc'
import { formatCents } from '../../../shared/money'

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(month) - 1]
  return `${Number(day)}-${monthName}-${year}`
}

export default function TransactionsPage() {
  const { id } = useParams<{ id: string }>()
  const bookId = Number(id)
  const [accountId, setAccountId] = useState<number | null>(null)
  const [latestFirst, setLatestFirst] = useState(true)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollToBottom = useRef(false)

  const { data: accounts } = trpc.books.accounts.useQuery({ id: bookId })
  const effectiveAccountId = accountId ?? accounts?.[0]?.id ?? null

  const { data, isLoading } = trpc.books.transactions.useQuery(
    { id: bookId, accountId: effectiveAccountId!, page, latestFirst },
    { enabled: effectiveAccountId != null, placeholderData: keepPreviousData },
  )

  useEffect(() => {
    if (scrollToBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      scrollToBottom.current = false
    }
  }, [data])
  const pageEntries = data?.entries ?? []
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
      <div className="mt-4 flex items-center justify-between">
        <select
          value={effectiveAccountId ?? ''}
          onChange={e => { setAccountId(Number(e.target.value)); setPage(1) }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {accounts?.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          <select
            value={latestFirst ? 'latest' : 'earliest'}
            onChange={e => { setLatestFirst(e.target.value === 'latest'); setPage(1) }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="latest">Latest first</option>
            <option value="earliest">Earliest first</option>
          </select>
          <select
            value={page}
            onChange={e => setPage(Number(e.target.value))}
            disabled={totalPages <= 1}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
          >
            {Array.from({ length: totalPages }, (_, i) => (
              <option key={i + 1} value={i + 1}>Page {i + 1}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-gray-500">Loading…</p>
      ) : (
        <>
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-200">
              <th className="pb-2 font-medium text-left w-24">Date</th>
              <th className="pb-2 font-medium text-left">Description</th>
              <th className="pb-2 font-medium text-left">Memo</th>
              <th className="pb-2 font-medium text-right w-24">Debit</th>
              <th className="pb-2 font-medium text-right w-24">Credit</th>
              <th className="pb-2 font-medium text-right w-24">Balance</th>
            </tr>
          </thead>
          <tbody>
            {pageEntries.map(entry => (
              <tr key={entry.id} className="border-t border-gray-200">
                <td className="py-1.5 pr-4 text-gray-500">{formatDate(entry.date)}</td>
                <td className="py-1.5 pr-4 text-gray-900">{entry.description}</td>
                <td className="py-1.5 pr-4 text-gray-500">{entry.memo}</td>
                <td className="py-1.5 text-right tabular-nums">{entry.debit != null ? formatCents(entry.debit) : ''}</td>
                <td className="py-1.5 text-right tabular-nums">{entry.credit != null ? formatCents(entry.credit) : ''}</td>
                <td className={`py-1.5 text-right tabular-nums ${entry.balance < 0 ? 'text-red-600' : ''}`}>
                  {formatCents(Math.abs(entry.balance))}{entry.balance < 0 ? ' CR' : ''}
                </td>
              </tr>
            ))}
            {pageEntries.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} className="pt-4 text-center text-sm text-gray-400">No transactions for this account.</td>
              </tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div ref={bottomRef} className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <button
              onClick={() => { scrollToBottom.current = true; setPage(p => p - 1) }}
              disabled={page === 1}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default"
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              onClick={() => { scrollToBottom.current = true; setPage(p => p + 1) }}
              disabled={page === totalPages}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default"
            >
              Next
            </button>
          </div>
        )}
        </>
      )}
    </div>
  )
}
