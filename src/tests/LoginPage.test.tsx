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
  },
}))

import { trpc } from '../lib/trpc'

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
      options?.onSuccess?.({ user: { email: input.email, name: input.email.split('@')[0] }, token: 'mock-token' })
    })
    return { mutate, isPending: false, error: null, ...overrides } as ReturnType<
      typeof trpc.login.useMutation
    >
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
    mockMutation()
    renderPage()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('calls login mutation with form values on submit', async () => {
    const user = userEvent.setup()
    const mutate = mockMutation()
    renderPage()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(mutate).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' })
  })

  it('sets user in auth store and navigates home on success', async () => {
    const user = userEvent.setup()
    mockMutation()
    renderPage()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(useAuthStore.getState().user).toEqual({ email: 'test@example.com', name: 'test' })
    expect(useAuthStore.getState().token).toBe('mock-token')
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('shows loading state while pending', () => {
    mockMutation({ isPending: true })
    renderPage()
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled()
  })

  it('shows the error message returned by the server', () => {
    mockMutation({ error: new Error('Invalid email or password') })
    renderPage()
    expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
  })

  it('shows a clean message for validation errors', () => {
    mockMutation({ error: new Error('Invalid email') })
    renderPage()
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
  })
})
