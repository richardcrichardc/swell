import type { AccountType } from './accounts'
import type {
  AnyTRPCRootTypes,
  TRPCBuiltRouter,
  TRPCQueryProcedure,
  TRPCMutationProcedure,
  TRPCRouterRecord,
} from '@trpc/server'

// ── Accounts ──────────────────────────────────────────────────────────────────

export type Account = {
  id: number
  name: string
  type: AccountType
  sortOrder: number
  hasTransactions: boolean
}

export type UpdateAccountInput = {
  id?: number
  type?: string
  name: string
  sortOrder: number
}

// ── Transactions list (books.journal) ────────────────────────────────────────

export type TransactionLine = {
  id: number
  transactionId: number
  accountType: AccountType | null
  accountName: string | null
  description: string
  salesTaxAmount: number | null
  debit: number | null   // positive cents, mutually exclusive with credit
  credit: number | null  // positive cents, mutually exclusive with debit
}

export type Transaction = {
  id: number
  date: string           // YYYY-MM-DD
  description: string
  lines: TransactionLine[]
}

// ── Transaction detail (books.getTransaction) ─────────────────────────────────

export type TransactionDetailLine = {
  id: number
  accountId: number
  accountType: AccountType | null
  accountName: string | null
  description: string
  debit: number | null   // positive cents, mutually exclusive with credit
  credit: number | null  // positive cents, mutually exclusive with debit
}

export type TransactionDetail = {
  id: number
  date: string           // YYYY-MM-DD
  description: string
  lines: TransactionDetailLine[]
}

// ── Mutation inputs ───────────────────────────────────────────────────────────

export type UpdateTransactionLineInput = {
  id?: number            // omit to insert a new line
  accountId: number
  description: string
  amount: number         // signed cents: positive = debit, negative = credit
}

export type UpdateTransactionInput = {
  bookId: number
  transactionId?: number // omit to create a new transaction
  date: string           // YYYY-MM-DD
  description: string
  lines: UpdateTransactionLineInput[]
}

// ── Router type declaration ───────────────────────────────────────────────────
// This is the authoritative API contract. The server implementation must
// satisfy this type; the client is typed against it.

type Procedure<TInput, TOutput> = { meta: unknown; input: TInput; output: TOutput }
type Query<TInput, TOutput> = TRPCQueryProcedure<Procedure<TInput, TOutput>>
type Mutation<TInput, TOutput> = TRPCMutationProcedure<Procedure<TInput, TOutput>>
type Router<TRecord extends TRPCRouterRecord> = TRPCBuiltRouter<AnyTRPCRootTypes, TRecord>

type AuthOutput = { user: { email: string; name: string }; token: string }

export type BooksRecord = {
  list:               Query<void, { id: number; name: string }[]>
  get:                Query<{ id: number }, { id: number; name: string | null; description: string | null }>
  create:             Mutation<{ name: string; description?: string; csvContent?: string }, { id: number; name: string }>
  update:             Mutation<{ id: number; name: string; description: string }, void>
  accounts:           Query<{ id: number }, Account[]>
  updateAccounts:     Mutation<{ bookId: number; updates: UpdateAccountInput[]; deletions?: number[] }, void>
  journal:            Query<{ id: number }, Transaction[]>
  getTransaction:     Query<{ bookId: number; transactionId: number }, TransactionDetail>
  updateTransaction:  Mutation<UpdateTransactionInput, { id: number }>
}

export type BooksRouter = Router<BooksRecord>

export type AppRouter = Router<{
  health:    Query<void, { status: 'ok' }>
  me:        Query<void, { user: { email: string; name: string } }>
  login:     Mutation<{ email: string; password: string }, AuthOutput>
  register:  Mutation<{ name: string; email: string; password: string }, AuthOutput>
  books:     BooksRecord
}>
