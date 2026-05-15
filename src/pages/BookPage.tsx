import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import BookDialog from '../components/BookDialog'

export default function BookPage() {
  const { id } = useParams<{ id: string }>()
  const bookId = Number(id)
  const utils = trpc.useUtils()
  const { data: book, isLoading, error } = trpc.books.get.useQuery({ id: bookId })
  const updateBook = trpc.books.update.useMutation({
    onSuccess: () => {
      void utils.books.get.invalidate({ id: bookId })
      setDialogOpen(false)
    },
  })
  const [dialogOpen, setDialogOpen] = useState(false)

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>

  if (error || !book) return <p className="text-sm text-red-600">Book not found.</p>

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">{book.name}</h1>
      <p className="mt-4 text-gray-600">
        {book.description || 'No description.'}
        <button
          onClick={() => setDialogOpen(true)}
          className="ml-2 cursor-pointer text-sm text-gray-400 hover:text-gray-600"
        >
          Edit
        </button>
      </p>

      {dialogOpen && (
        <BookDialog
          title="Edit Book"
          initialName={book.name ?? ''}
          initialDescription={book.description ?? ''}
          isPending={updateBook.isPending}
          error={updateBook.error?.message}
          onSave={(data) => updateBook.mutate({ id: bookId, ...data })}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  )
}
