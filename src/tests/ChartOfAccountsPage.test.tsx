import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ChartOfAccountsPage from '../pages/ChartOfAccountsPage'

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
  PointerSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn().mockReturnValue([]),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
  arrayMove: (arr: any[], from: number, to: number) => {
    const result = [...arr]
    result.splice(to, 0, result.splice(from, 1)[0])
    return result
  },
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn().mockReturnValue('') } },
}))

vi.mock('../lib/trpc', () => ({
  trpc: {
    books: {
      accounts: { useQuery: vi.fn() },
      updateAccounts: { useMutation: vi.fn() },
    },
  },
}))

import { trpc } from '../lib/trpc'

const testAccounts = [
  { id: 1, name: 'Cash', type: 'Asset', sortOrder: 0, hasTransactions: false },
  { id: 2, name: 'Accounts Receivable', type: 'Asset', sortOrder: 1, hasTransactions: true },
  { id: 3, name: 'Revenue', type: 'Income', sortOrder: 0, hasTransactions: false },
]

function mockAccounts(accounts = testAccounts) {
  const refetch = vi.fn().mockResolvedValue(undefined)
  const mutateAsync = vi.fn().mockResolvedValue(undefined)
  vi.mocked(trpc.books.accounts.useQuery).mockReturnValue({ data: accounts, isLoading: false, refetch } as any)
  vi.mocked(trpc.books.updateAccounts.useMutation).mockReturnValue({ mutateAsync } as any)
  return { refetch, mutateAsync }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/books/1/accounts']}>
      <Routes>
        <Route path="/books/:id/accounts" element={<ChartOfAccountsPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ChartOfAccountsPage (read mode)', () => {
  it('shows account names grouped by type', () => {
    mockAccounts()
    renderPage()
    expect(screen.getByText('Cash')).toBeInTheDocument()
    expect(screen.getByText('Accounts Receivable')).toBeInTheDocument()
    expect(screen.getByText('Revenue')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(trpc.books.accounts.useQuery).mockReturnValue({ data: undefined, isLoading: true, refetch: vi.fn() } as any)
    vi.mocked(trpc.books.updateAccounts.useMutation).mockReturnValue({ mutateAsync: vi.fn() } as any)
    renderPage()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows Edit button', () => {
    mockAccounts()
    renderPage()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })
})

describe('ChartOfAccountsPage (edit mode)', () => {
  it('shows inputs with account names and Cancel/Save buttons after clicking Edit', async () => {
    const user = userEvent.setup()
    mockAccounts()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Cash')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Accounts Receivable')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Revenue')).toBeInTheDocument()
  })

  it('returns to read mode with original names after Cancel', async () => {
    const user = userEvent.setup()
    mockAccounts()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('Cash')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('shows a New account placeholder input at the bottom of each non-empty type group', async () => {
    const user = userEvent.setup()
    mockAccounts()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const newInputs = screen.getAllByPlaceholderText('New account')
    // Two non-empty groups: Asset and Income
    expect(newInputs.length).toBeGreaterThanOrEqual(2)
  })

  it('adds another New account input when text is typed into the placeholder', async () => {
    const user = userEvent.setup()
    mockAccounts()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const before = screen.getAllByPlaceholderText('New account').length
    await user.type(screen.getAllByPlaceholderText('New account')[0], 'Savings')
    expect(screen.getAllByPlaceholderText('New account').length).toBe(before + 1)
  })

  it('disables the delete button for accounts that have transactions', async () => {
    const user = userEvent.setup()
    mockAccounts()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const deleteButtons = screen.getAllByRole('button', { name: '×' })
    const arDisabled = deleteButtons.filter(b => (b as HTMLButtonElement).disabled)
    expect(arDisabled.length).toBeGreaterThan(0)
  })

  it('removes an account from the list when its delete button is clicked', async () => {
    const user = userEvent.setup()
    mockAccounts()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByDisplayValue('Cash')).toBeInTheDocument()
    const enabledDelete = screen.getAllByRole('button', { name: '×' }).find(b => !(b as HTMLButtonElement).disabled)!
    await user.click(enabledDelete)
    expect(screen.queryByDisplayValue('Cash')).not.toBeInTheDocument()
  })

  it('calls mutateAsync with updates and deletions on Save', async () => {
    const user = userEvent.setup()
    const { mutateAsync } = mockAccounts()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const cashInput = screen.getByDisplayValue('Cash')
    await user.clear(cashInput)
    await user.type(cashInput, 'Petty Cash')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    const call = mutateAsync.mock.calls[0][0]
    expect(call.bookId).toBe(1)
    expect(call.updates).toContainEqual({ id: 1, name: 'Petty Cash', sortOrder: 0 })
    expect(call.deletions).toEqual([])
  })

  it('includes deleted account ids in deletions on Save', async () => {
    const user = userEvent.setup()
    const { mutateAsync } = mockAccounts()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const enabledDelete = screen.getAllByRole('button', { name: '×' }).find(b => !(b as HTMLButtonElement).disabled)!
    await user.click(enabledDelete)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0][0].deletions).toContain(1)
  })

  it('returns to read mode after Save', async () => {
    const user = userEvent.setup()
    mockAccounts()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument())
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
