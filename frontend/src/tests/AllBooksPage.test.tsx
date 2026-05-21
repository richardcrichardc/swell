import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AllBooksPage from '../pages/AllBooksPage'
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
    mutate.mockImplementation((input: { name: string; description: string }) => {
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

describe('AllBooksPage (logged out)', () => {
  it('redirects to login', () => {
    mockBooks()
    render(<MemoryRouter><AllBooksPage /></MemoryRouter>)
    expect(screen.queryByRole('heading', { name: 'All Books' })).not.toBeInTheDocument()
  })
})

describe('AllBooksPage (logged in)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: testUser, token: 'mock-token' })
  })

  it('shows the books heading', () => {
    mockBooks()
    render(<MemoryRouter><AllBooksPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'All Books' })).toBeInTheDocument()
  })

  it('lists existing books', () => {
    mockBooks([{ id: 1, name: 'Personal' }, { id: 2, name: 'Business' }])
    render(<MemoryRouter><AllBooksPage /></MemoryRouter>)
    expect(screen.getByText('Personal')).toBeInTheDocument()
    expect(screen.getByText('Business')).toBeInTheDocument()
  })

  it('shows empty state when no books', () => {
    mockBooks([])
    render(<MemoryRouter><AllBooksPage /></MemoryRouter>)
    expect(screen.getByText('No books yet. Add one above.')).toBeInTheDocument()
  })

  it('automatically opens the New Book dialog when there are no books', async () => {
    mockBooks([])
    render(<MemoryRouter><AllBooksPage /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'New Book' })).toBeInTheDocument()
  })

  it('opens the dialog when New Book is clicked', async () => {
    const user = userEvent.setup()
    mockBooks()
    render(<MemoryRouter><AllBooksPage /></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: 'New Book' }))

    expect(screen.getByRole('heading', { name: 'New Book' })).toBeInTheDocument()
  })

  it('calls create mutation with name and description from dialog', async () => {
    const user = userEvent.setup()
    const mutate = mockBooks()
    render(<MemoryRouter><AllBooksPage /></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: 'New Book' }))
    await user.type(screen.getByLabelText('Name'), 'My New Book')
    await user.type(screen.getByLabelText('Description'), 'A description')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mutate).toHaveBeenCalledWith({ name: 'My New Book', description: 'A description' })
  })
})
