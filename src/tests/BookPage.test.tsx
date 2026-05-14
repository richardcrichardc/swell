import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import BookPage from '../pages/BookPage'

vi.mock('../lib/trpc', () => ({
  trpc: {
    books: {
      get: {
        useQuery: vi.fn(),
      },
    },
  },
}))

import { trpc } from '../lib/trpc'

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
    vi.mocked(trpc.books.get.useQuery).mockReturnValue({ isLoading: true, data: undefined, error: null } as any)
    renderBookPage()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows the book name and description', () => {
    vi.mocked(trpc.books.get.useQuery).mockReturnValue({
      isLoading: false,
      data: { id: 1, name: 'Personal', description: 'My finances' },
      error: null,
    } as any)
    renderBookPage()
    expect(screen.getByRole('heading', { name: 'Personal' })).toBeInTheDocument()
    expect(screen.getByText('My finances')).toBeInTheDocument()
  })

  it('shows fallback when description is null', () => {
    vi.mocked(trpc.books.get.useQuery).mockReturnValue({
      isLoading: false,
      data: { id: 1, name: 'Personal', description: null },
      error: null,
    } as any)
    renderBookPage()
    expect(screen.getByText('No description.')).toBeInTheDocument()
  })

  it('shows not found message on error', () => {
    vi.mocked(trpc.books.get.useQuery).mockReturnValue({
      isLoading: false,
      data: undefined,
      error: { message: 'Book not found' },
    } as any)
    renderBookPage()
    expect(screen.getByText('Book not found.')).toBeInTheDocument()
  })
})
