import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import { useAuthStore } from '../store/useAuthStore'

vi.mock('../lib/trpc', () => ({
  trpc: {
    books: {
      list: {
        useQuery: vi.fn(),
      },
      create: {
        useMutation: vi.fn(),
      },
    },
    useUtils: vi.fn(),
  },
}))

import { trpc } from '../lib/trpc'

const testUser = { email: 'test@example.com', name: 'Test User' }

function mockBooks(books: { id: number; name: string }[] = [], overrides: { isPending?: boolean } = {}) {
  const mutate = vi.fn()
  const invalidate = vi.fn().mockResolvedValue(undefined)
  vi.mocked(trpc.useUtils).mockReturnValue({
    books: { list: { invalidate } },
  } as any)
  vi.mocked(trpc.books.list.useQuery).mockReturnValue({
    data: books,
    isLoading: false,
  } as any)
  vi.mocked(trpc.books.create.useMutation).mockImplementation((options) => {
    mutate.mockImplementation((input: { name: string }) => {
      options?.onSuccess?.({ id: 99, name: input.name })
    })
    return { mutate, isPending: false, error: null, ...overrides } as any
  })
  return mutate
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, token: null })
})

describe('HomePage (logged out)', () => {
  it('shows the landing page', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Swell Accounting' })).toBeInTheDocument()
  })
})

describe('HomePage (logged in)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: testUser, token: 'mock-token' })
  })

  it('shows the books heading', () => {
    mockBooks()
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Your Books' })).toBeInTheDocument()
  })

  it('lists existing books', () => {
    mockBooks([{ id: 1, name: 'Personal' }, { id: 2, name: 'Business' }])
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByText('Personal')).toBeInTheDocument()
    expect(screen.getByText('Business')).toBeInTheDocument()
  })

  it('shows empty state when no books', () => {
    mockBooks([])
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByText('No books yet. Add one above.')).toBeInTheDocument()
  })

  it('calls create mutation with the book name', async () => {
    const user = userEvent.setup()
    const mutate = mockBooks()
    render(<MemoryRouter><HomePage /></MemoryRouter>)

    await user.type(screen.getByPlaceholderText('Book name'), 'My New Book')
    await user.click(screen.getByRole('button', { name: 'Add book' }))

    expect(mutate).toHaveBeenCalledWith({ name: 'My New Book' })
  })

  it('shows loading state while creating', () => {
    mockBooks([], { isPending: true })
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Adding…' })).toBeDisabled()
  })
})
