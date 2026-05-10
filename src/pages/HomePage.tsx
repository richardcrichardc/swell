import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { trpc } from '../lib/trpc'

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
      setName('')
    },
  })
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      createBook.mutate({ name: name.trim() })
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Your Books</h1>

      <form onSubmit={handleSubmit} className="mt-8 flex gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Book name"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={createBook.isPending || !name.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {createBook.isPending ? 'Adding…' : 'Add book'}
        </button>
      </form>

      {createBook.error && (
        <p className="mt-2 text-sm text-red-600">{createBook.error.message}</p>
      )}

      <ul className="mt-6 divide-y divide-gray-200 rounded-md border border-gray-200">
        {isLoading && (
          <li className="px-4 py-3 text-sm text-gray-500">Loading…</li>
        )}
        {books?.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-500">No books yet. Add one above.</li>
        )}
        {books?.map((book) => (
          <li key={book.id} className="px-4 py-3 text-sm text-gray-900">
            {book.name}
          </li>
        ))}
      </ul>
    </main>
  )
}
