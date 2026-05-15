import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'

export default function BookPage() {
  const { id } = useParams<{ id: string }>()
  const bookId = Number(id)
  const utils = trpc.useUtils()
  const { data: book, isLoading, error } = trpc.books.get.useQuery({ id: bookId })
  const setDescription = trpc.books.setDescription.useMutation({
    onSuccess: () => {
      void utils.books.get.invalidate({ id: bookId })
      setIsEditing(false)
    },
  })

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

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

  const handleEdit = () => {
    setEditValue(book.description ?? '')
    setIsEditing(true)
  }

  const handleSave = () => {
    setDescription.mutate({ id: bookId, description: editValue })
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
        ← Books
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">{book.name}</h1>

      {isEditing ? (
        <div className="mt-4">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {setDescription.error && (
            <p className="mt-1 text-sm text-red-600">{setDescription.error.message}</p>
          )}
          <div className="mt-2 flex gap-3">
            <button
              onClick={handleSave}
              disabled={setDescription.isPending}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {setDescription.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="cursor-pointer text-sm text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-gray-600">
          {book.description || 'No description.'}
          <button
            onClick={handleEdit}
            className="ml-2 cursor-pointer text-sm text-gray-400 hover:text-gray-600"
          >
            Edit
          </button>
        </p>
      )}
    </main>
  )
}
