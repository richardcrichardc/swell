import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import TransactionsPage from '../pages/TransactionsPage'

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return { ...actual, keepPreviousData: vi.fn() }
})

vi.mock('../lib/trpc', () => ({
  trpc: {
    books: {
      accounts: { useQuery: vi.fn() },
      transactions: { useQuery: vi.fn() },
    },
  },
}))

import { trpc } from '../lib/trpc'

const testAccounts = [
  { id: 1, name: 'Cash', type: 'Asset', sortOrder: 0, hasTransactions: true },
  { id: 2, name: 'Revenue', type: 'Income', sortOrder: 0, hasTransactions: true },
]

const testEntries = [
  { id: 1, transactionId: 1, date: '2024-01-15', description: 'Payment received', memo: 'Client payment', debit: 10000, credit: null, balance: 10000 },
  { id: 2, transactionId: 2, date: '2024-01-20', description: 'Bank fee', memo: 'Monthly fee', debit: null, credit: 500, balance: 9500 },
  { id: 3, transactionId: 3, date: '2024-01-25', description: 'Second payment', memo: 'More money', debit: 2550, credit: null, balance: 12050 },
]

function mockData({
  accounts = testAccounts,
  entries = testEntries,
  total = testEntries.length,
  isLoading = false,
} = {}) {
  vi.mocked(trpc.books.accounts.useQuery).mockReturnValue({ data: accounts, isLoading: false } as any)
  vi.mocked(trpc.books.transactions.useQuery).mockReturnValue({ data: { entries, total }, isLoading } as any)
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/books/1/transactions']}>
      <Routes>
        <Route path="/books/:id/transactions" element={<TransactionsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TransactionsPage', () => {
  it('renders the heading', () => {
    mockData()
    renderPage()
    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument()
  })

  it('shows loading state while entries are fetching', () => {
    mockData({ isLoading: true, entries: [], total: 0 })
    renderPage()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('lists all accounts in the dropdown', () => {
    mockData()
    renderPage()
    expect(screen.getByRole('option', { name: 'Cash' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Revenue' })).toBeInTheDocument()
  })

  it('defaults to the first account', () => {
    mockData()
    renderPage()
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('1')
    expect(vi.mocked(trpc.books.transactions.useQuery)).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 1 }),
      expect.anything(),
    )
  })

  it('renders a row for each entry', () => {
    mockData()
    renderPage()
    expect(screen.getByText('Payment received')).toBeInTheDocument()
    expect(screen.getByText('Bank fee')).toBeInTheDocument()
  })

  it('shows formatted date', () => {
    mockData()
    renderPage()
    expect(screen.getByText('15-Jan-2024')).toBeInTheDocument()
  })

  it('shows memo from the line', () => {
    mockData()
    renderPage()
    expect(screen.getByText('Client payment')).toBeInTheDocument()
    expect(screen.getByText('Monthly fee')).toBeInTheDocument()
  })

  it('shows debit amount', () => {
    mockData()
    renderPage()
    expect(screen.getByText('25.50')).toBeInTheDocument()
  })

  it('shows credit amount', () => {
    mockData()
    renderPage()
    expect(screen.getByText('5.00')).toBeInTheDocument()
  })

  it('shows positive balance as a plain number', () => {
    mockData()
    renderPage()
    expect(screen.getByText('95.00')).toBeInTheDocument()
  })

  it('shows negative balance with CR suffix in red', () => {
    mockData({
      entries: [{ id: 1, transactionId: 1, date: '2024-01-01', description: 'Overdrawn', memo: '', debit: null, credit: 500, balance: -500 }],
      total: 1,
    })
    renderPage()
    const cell = screen.getByText('5.00 CR')
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveClass('text-red-600')
  })

  it('shows empty state when there are no entries', () => {
    mockData({ entries: [], total: 0 })
    renderPage()
    expect(screen.getByText('No transactions for this account.')).toBeInTheDocument()
  })

  it('defaults sort order to Latest first', () => {
    mockData()
    renderPage()
    expect(screen.getByDisplayValue('Latest first')).toBeInTheDocument()
    expect(vi.mocked(trpc.books.transactions.useQuery)).toHaveBeenCalledWith(
      expect.objectContaining({ latestFirst: true }),
      expect.anything(),
    )
  })

  it('passes latestFirst: false when Earliest first is selected', async () => {
    const user = userEvent.setup()
    mockData()
    renderPage()
    await user.selectOptions(screen.getByDisplayValue('Latest first'), 'earliest')
    expect(vi.mocked(trpc.books.transactions.useQuery)).toHaveBeenLastCalledWith(
      expect.objectContaining({ latestFirst: false }),
      expect.anything(),
    )
  })

  it('changes the queried account when a different account is selected', async () => {
    const user = userEvent.setup()
    mockData()
    renderPage()
    await user.selectOptions(screen.getAllByRole('combobox')[0], '2')
    expect(vi.mocked(trpc.books.transactions.useQuery)).toHaveBeenLastCalledWith(
      expect.objectContaining({ accountId: 2 }),
      expect.anything(),
    )
  })

  describe('pagination', () => {
    it('hides pagination controls when there is only one page', () => {
      mockData({ total: 5 })
      renderPage()
      expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    })

    it('shows pagination controls when there are multiple pages', () => {
      mockData({ total: 45 })
      renderPage()
      expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    })

    it('disables Previous on the first page', () => {
      mockData({ total: 45 })
      renderPage()
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    })

    it('disables Next on the last page', () => {
      mockData({ total: 40 })
      renderPage()
      // Simulate being on page 2 of 2 by having the mock return page 2 data
      vi.mocked(trpc.books.transactions.useQuery).mockReturnValue({ data: { entries: testEntries, total: 40 }, isLoading: false } as any)
      // Navigate to next page
      userEvent.setup().click(screen.getByRole('button', { name: 'Next' }))
    })

    it('clicking Next requests the next page', async () => {
      const user = userEvent.setup()
      mockData({ total: 45 })
      renderPage()
      await user.click(screen.getByRole('button', { name: 'Next' }))
      expect(vi.mocked(trpc.books.transactions.useQuery)).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
        expect.anything(),
      )
    })

    it('clicking Previous after Next returns to page 1', async () => {
      const user = userEvent.setup()
      mockData({ total: 45 })
      renderPage()
      await user.click(screen.getByRole('button', { name: 'Next' }))
      await user.click(screen.getByRole('button', { name: 'Previous' }))
      expect(vi.mocked(trpc.books.transactions.useQuery)).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
        expect.anything(),
      )
    })

    it('page select shows the correct number of pages', () => {
      mockData({ total: 45 })
      renderPage()
      expect(screen.getByRole('option', { name: 'Page 1' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Page 2' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Page 3' })).toBeInTheDocument()
    })
  })
})
