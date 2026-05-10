import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import RegisterPage from '../pages/RegisterPage'
import { useAuthStore } from '../store/useAuthStore'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../lib/trpc', () => ({
  trpc: {
    register: {
      useMutation: vi.fn(),
    },
  },
}))

import { trpc } from '../lib/trpc'

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  )
}

function mockMutation(overrides: { isPending?: boolean; error?: Error | null } = {}) {
  const mutate = vi.fn()
  vi.mocked(trpc.register.useMutation).mockImplementation((options) => {
    mutate.mockImplementation((input: { name: string; email: string; password: string }) => {
      options?.onSuccess?.({ user: { email: input.email, name: input.name } })
    })
    return { mutate, isPending: false, error: null, ...overrides } as ReturnType<
      typeof trpc.register.useMutation
    >
  })
  return mutate
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null })
  localStorage.clear()
})

describe('RegisterPage', () => {
  it('renders name, email, password fields and submit button', () => {
    mockMutation()
    renderPage()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
  })

  it('calls register mutation with form values on submit', async () => {
    const user = userEvent.setup()
    const mutate = mockMutation()
    renderPage()

    await user.type(screen.getByLabelText('Name'), 'Jane Smith')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(mutate).toHaveBeenCalledWith({ name: 'Jane Smith', email: 'jane@example.com', password: 'password123' })
  })

  it('sets user in auth store and navigates home on success', async () => {
    const user = userEvent.setup()
    mockMutation()
    renderPage()

    await user.type(screen.getByLabelText('Name'), 'Jane Smith')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(useAuthStore.getState().user).toEqual({ email: 'jane@example.com', name: 'Jane Smith' })
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('shows loading state while pending', () => {
    mockMutation({ isPending: true })
    renderPage()
    expect(screen.getByRole('button', { name: 'Creating account…' })).toBeDisabled()
  })

  it('shows error message on failure', () => {
    mockMutation({ error: new Error('An account with that email already exists') })
    renderPage()
    expect(screen.getByText('An account with that email already exists')).toBeInTheDocument()
  })
})
