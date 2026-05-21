import { useState, useEffect } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { trpc } from '../lib/trpc'
import BookDialog from '../components/BookDialog'

export default function AllBooksPage() {
  const user = useAuthStore((state) => state.user)
  if (!user) return <Navigate to="/login" replace />

  return <BooksView />
}

function BooksView() {
  const navigate = useNavigate()
  const { data: books, isLoading } = trpc.books.list.useQuery()
  const utils = trpc.useUtils()
  const createBook = trpc.books.create.useMutation({
    onSuccess: (book) => {
      void utils.books.list.invalidate()
      void navigate(`/books/${book.id}`)
    },
  })
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (books?.length === 0) setDialogOpen(true)
  }, [books])

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">All Books</h1>
        <button
          onClick={() => setDialogOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Book
        </button>
      </div>

      <ul className="mt-6 divide-y divide-gray-200 rounded-md border border-gray-200">
        {isLoading && (
          <li className="px-4 py-3 text-sm text-gray-500">Loading…</li>
        )}
        {books?.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-500">No books yet. Add one above.</li>
        )}
        {books?.map((book) => (
          <li key={book.id} className="px-4 py-3 text-sm">
            <Link to={`/books/${book.id}`} className="text-gray-900 hover:text-blue-600">
              {book.name}
            </Link>
          </li>
        ))}
      </ul>

      {dialogOpen && (
        <BookDialog
          title="New Book"
          showImport
          isPending={createBook.isPending}
          error={createBook.error?.message}
          onSave={(data) => createBook.mutate(data)}
          onClose={() => { setDialogOpen(false); createBook.reset() }}
        />
      )}
    </main>
  )
}
