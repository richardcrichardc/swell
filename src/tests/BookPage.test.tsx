import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import BookPage from '../pages/BookPage'

vi.mock('../lib/trpc', () => ({
  trpc: {
    useUtils: vi.fn(),
    books: {
      get: {
        useQuery: vi.fn(),
      },
      setDescription: {
        useMutation: vi.fn(),
      },
    },
  },
}))

import { trpc } from '../lib/trpc'

function mockBook(data: { id: number; name: string; description: string | null } | undefined, overrides: { isLoading?: boolean; error?: object | null } = {}) {
  vi.mocked(trpc.useUtils).mockReturnValue({ books: { get: { invalidate: vi.fn() } } } as any)
  vi.mocked(trpc.books.setDescription.useMutation).mockReturnValue({ mutate: vi.fn(), isPending: false, error: null } as any)
  vi.mocked(trpc.books.get.useQuery).mockReturnValue({
    isLoading: false,
    data,
    error: null,
    ...overrides,
  } as any)
}

function renderBookPage(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/books/${id}`]}>
      <Routes>
        <Route path="/books/:id" element={<BookPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BookPage', () => {
  it('shows loading state', () => {
    mockBook(undefined, { isLoading: true })
    renderBookPage()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows the book name and description', () => {
    mockBook({ id: 1, name: 'Personal', description: 'My finances' })
    renderBookPage()
    expect(screen.getByRole('heading', { name: 'Personal' })).toBeInTheDocument()
    expect(screen.getByText(/My finances/)).toBeInTheDocument()
  })

  it('shows fallback when description is null', () => {
    mockBook({ id: 1, name: 'Personal', description: null })
    renderBookPage()
    expect(screen.getByText(/No description\./)).toBeInTheDocument()
  })

  it('shows fallback when description is empty string', () => {
    mockBook({ id: 1, name: 'Personal', description: '' })
    renderBookPage()
    expect(screen.getByText(/No description\./)).toBeInTheDocument()
  })

  it('shows not found message on error', () => {
    mockBook(undefined, { error: { message: 'Book not found' } })
    renderBookPage()
    expect(screen.getByText('Book not found.')).toBeInTheDocument()
  })
})
