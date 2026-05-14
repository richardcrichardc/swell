import { Link, useParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'

export default function BookPage() {
  const { id } = useParams<{ id: string }>()
  const { data: book, isLoading, error } = trpc.books.get.useQuery({ id: Number(id) })

  if (isLoading) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    )
  }

  if (error || !book) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-sm text-red-600">Book not found.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-800">
          ← Back to books
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
        ← Books
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">{book.name}</h1>
      <p className="mt-4 text-gray-600">{book.description ?? 'No description.'}</p>
    </main>
  )
}
