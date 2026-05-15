import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { trpc } from '../lib/trpc'
import BookDialog from '../components/BookDialog'

export default function HomePage() {
  const user = useAuthStore((state) => state.user)
  return user ? <BooksView /> : <LandingView />
}

function LandingView() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900">Swell Accounting</h1>
      <p className="mt-6 text-lg leading-relaxed text-gray-600">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
        labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
        laboris nisi ut aliquip ex ea commodo consequat.
      </p>
      <p className="mt-4 text-lg leading-relaxed text-gray-600">
        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
        pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
        mollit anim id est laborum.
      </p>
    </main>
  )
}

function BooksView() {
  const { data: books, isLoading } = trpc.books.list.useQuery()
  const utils = trpc.useUtils()
  const createBook = trpc.books.create.useMutation({
    onSuccess: () => {
      void utils.books.list.invalidate()
      setDialogOpen(false)
    },
  })
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Your Books</h1>
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
          isPending={createBook.isPending}
          error={createBook.error?.message}
          onSave={(data) => createBook.mutate(data)}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </main>
  )
}
