import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import LoginPage from '../pages/LoginPage'
import { useAuthStore } from '../store/useAuthStore'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../lib/trpc', () => ({
  trpc: {
    login: {
      useMutation: vi.fn(),
    },
    useUtils: vi.fn(),
  },
}))

import { trpc } from '../lib/trpc'

function mockUtils(books: { id: number; name: string }[] = []) {
  vi.mocked(trpc.useUtils).mockReturnValue({
    books: { list: { fetch: vi.fn().mockResolvedValue(books) } },
  } as any)
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

function mockMutation(overrides: { isPending?: boolean; error?: Error | null } = {}) {
  const mutate = vi.fn()
  vi.mocked(trpc.login.useMutation).mockImplementation((options) => {
    mutate.mockImplementation((input: { email: string; password: string }) => {
      options?.onSuccess?.({ user: { email: input.email, name: input.email.split('@')[0] }, token: 'mock-token' }, input, undefined, {} as any)
    })
    return { mutate, isPending: false, error: null, ...overrides } as any
  })
  return mutate
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, token: null })
  localStorage.clear()
})

describe('LoginPage', () => {
  it('renders email, password fields and sign in button', () => {
    mockUtils()
    mockMutation()
    renderPage()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('calls login mutation with form values on submit', async () => {
    const user = userEvent.setup()
    mockUtils()
    const mutate = mockMutation()
    renderPage()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(mutate).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' })
  })

  it('navigates to /books when there are no books', async () => {
    const user = userEvent.setup()
    mockUtils([])
    mockMutation()
    renderPage()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(useAuthStore.getState().user).toEqual({ email: 'test@example.com', name: 'test' })
    expect(useAuthStore.getState().token).toBe('mock-token')
    expect(mockNavigate).toHaveBeenCalledWith('/books')
  })

  it('navigates to /books when there are multiple books', async () => {
    const user = userEvent.setup()
    mockUtils([{ id: 1, name: 'Personal' }, { id: 2, name: 'Business' }])
    mockMutation()
    renderPage()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(mockNavigate).toHaveBeenCalledWith('/books')
  })

  it('navigates directly to the book dashboard when there is only one book', async () => {
    const user = userEvent.setup()
    mockUtils([{ id: 42, name: 'Personal' }])
    mockMutation()
    renderPage()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(mockNavigate).toHaveBeenCalledWith('/books/42')
  })

  it('shows loading state while pending', () => {
    mockUtils()
    mockMutation({ isPending: true })
    renderPage()
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled()
  })

  it('shows the error message returned by the server', () => {
    mockUtils()
    mockMutation({ error: new Error('Invalid email or password') })
    renderPage()
    expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
  })

  it('shows a clean message for validation errors', () => {
    mockUtils()
    mockMutation({ error: new Error('Invalid email') })
    renderPage()
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
  })
})
