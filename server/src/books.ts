import { z } from 'zod'
import { eq, asc, and, count, inArray } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from './trpc'
import { books } from './db/schema'
import { getBookDb, getKvp, setKvp, account, transaction, line } from './db/bookDb'
import { validateWaveCsv, importWaveCsv } from './waveImport'
import type { BooksRouter } from '../../shared/api'
import { AccountType, AccountTypeSign } from '../../shared/accounts'

export const booksRouter: BooksRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userBooks = await ctx.db.query.books.findMany({
      where: eq(books.userId, ctx.user.id),
      orderBy: [asc(books.createdAt)],
    })
    return userBooks.map((b) => ({ id: b.id, name: b.name }))
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const book = await ctx.db.query.books.findFirst({
        where: and(eq(books.id, input.id), eq(books.userId, ctx.user.id)),
      })
      if (!book) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Book not found' })
      }
      const bookDb = getBookDb(book.id)
      const name = getKvp(bookDb, 'name')
      const description = getKvp(bookDb, 'description')
      return { id: book.id, name, description }
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1, 'Name is required'), description: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const book = await ctx.db.query.books.findFirst({
        where: and(eq(books.id, input.id), eq(books.userId, ctx.user.id)),
      })
      if (!book) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Book not found' })
      }
      ctx.db.update(books).set({ name: input.name }).where(eq(books.id, input.id)).run()
      const bookDb = getBookDb(book.id)
      setKvp(bookDb, 'name', input.name)
      setKvp(bookDb, 'description', input.description)
    }),

  accounts: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const book = await ctx.db.query.books.findFirst({
        where: and(eq(books.id, input.id), eq(books.userId, ctx.user.id)),
      })
      if (!book) throw new TRPCError({ code: 'NOT_FOUND', message: 'Book not found' })
      const bookDb = getBookDb(book.id)
      return bookDb
        .select({ id: account.id, name: account.name, type: account.type, sortOrder: account.sortOrder, lineCount: count(line.id) })
        .from(account)
        .leftJoin(line, eq(line.accountId, account.id))
        .groupBy(account.id)
        .orderBy(asc(account.type), asc(account.sortOrder), asc(account.name))
        .all()
        .map(({ lineCount, type, ...rest }) => ({ ...rest, type: type as AccountType, hasTransactions: lineCount > 0 }))
    }),

  updateAccounts: protectedProcedure
    .input(z.object({
      bookId: z.number(),
      updates: z.array(z.object({ id: z.number().optional(), type: z.string().optional(), name: z.string().min(1), sortOrder: z.number() })),
      deletions: z.array(z.number()).default([]),
    }))
    .mutation(async ({ input, ctx }) => {
      const book = await ctx.db.query.books.findFirst({
        where: and(eq(books.id, input.bookId), eq(books.userId, ctx.user.id)),
      })
      if (!book) throw new TRPCError({ code: 'NOT_FOUND', message: 'Book not found' })
      const bookDb = getBookDb(book.id)
      for (const accountId of input.deletions) {
        const hasLines = bookDb.select().from(line).where(eq(line.accountId, accountId)).get()
        if (hasLines) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Account has transactions and cannot be deleted' })
        bookDb.delete(account).where(eq(account.id, accountId)).run()
      }
      for (const { id, type, name, sortOrder } of input.updates) {
        if (id == null) {
          bookDb.insert(account).values({ name, type: type!, sortOrder }).run()
        } else {
          bookDb.update(account).set({ name, sortOrder }).where(eq(account.id, id)).run()
        }
      }
    }),

  journal: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const book = await ctx.db.query.books.findFirst({
        where: and(eq(books.id, input.id), eq(books.userId, ctx.user.id)),
      })
      if (!book) throw new TRPCError({ code: 'NOT_FOUND', message: 'Book not found' })
      const bookDb = getBookDb(book.id)
      const txns = bookDb.select().from(transaction).orderBy(asc(transaction.date)).all()
      const lines = bookDb.select({
        id: line.id,
        transactionId: line.transactionId,
        accountType: account.type,
        accountName: account.name,
        description: line.description,
        amount: line.amount,
        salesTaxAmount: line.salesTaxAmount,
      }).from(line).leftJoin(account, eq(line.accountId, account.id)).all()
        .map(({ amount, accountType, ...rest }) => ({
          ...rest,
          accountType: accountType as AccountType | null,
          debit: amount > 0 ? amount : null,
          credit: amount < 0 ? Math.abs(amount) : null,
        }))
      const linesByTxn = new Map<number, typeof lines>()
      for (const l of lines) {
        const arr = linesByTxn.get(l.transactionId) ?? []
        arr.push(l)
        linesByTxn.set(l.transactionId, arr)
      }
      return txns.map(txn => ({ ...txn, lines: linesByTxn.get(txn.id) ?? [] }))
    }),

  transactions: protectedProcedure
    .input(z.object({ id: z.number(), accountId: z.number(), page: z.number().int().min(1), latestFirst: z.boolean() }))
    .query(async ({ input, ctx }) => {
      const PAGE_SIZE = 20
      const book = await ctx.db.query.books.findFirst({
        where: and(eq(books.id, input.id), eq(books.userId, ctx.user.id)),
      })
      if (!book) throw new TRPCError({ code: 'NOT_FOUND', message: 'Book not found' })
      const bookDb = getBookDb(book.id)
      const acct = bookDb.select({ type: account.type }).from(account).where(eq(account.id, input.accountId)).get()
      if (!acct) throw new TRPCError({ code: 'NOT_FOUND', message: 'Account not found' })
      const sign = AccountTypeSign[acct.type as AccountType]
      const rows = bookDb
        .select({
          id: line.id,
          transactionId: line.transactionId,
          date: transaction.date,
          description: transaction.description,
          memo: line.description,
          amount: line.amount,
        })
        .from(line)
        .innerJoin(transaction, eq(line.transactionId, transaction.id))
        .where(eq(line.accountId, input.accountId))
        .orderBy(asc(transaction.date), asc(transaction.id))
        .all()
      let balance = 0
      const all = rows.map(row => {
        balance += row.amount * sign
        return {
          id: row.id,
          transactionId: row.transactionId,
          date: row.date,
          description: row.description,
          memo: row.memo,
          debit: row.amount > 0 ? row.amount : null,
          credit: row.amount < 0 ? Math.abs(row.amount) : null,
          balance,
        }
      })
      const total = all.length
      const ordered = input.latestFirst ? all.slice().reverse() : all
      const entries = ordered.slice((input.page - 1) * PAGE_SIZE, input.page * PAGE_SIZE)
      return { entries, total }
    }),

  getTransaction: protectedProcedure
    .input(z.object({ bookId: z.number(), transactionId: z.number() }))
    .query(async ({ input, ctx }) => {
      const book = await ctx.db.query.books.findFirst({
        where: and(eq(books.id, input.bookId), eq(books.userId, ctx.user.id)),
      })
      if (!book) throw new TRPCError({ code: 'NOT_FOUND', message: 'Book not found' })
      const bookDb = getBookDb(book.id)
      const txn = bookDb.select().from(transaction).where(eq(transaction.id, input.transactionId)).get()
      if (!txn) throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found' })
      const lines = bookDb.select({
        id: line.id,
        accountId: line.accountId,
        accountType: account.type,
        accountName: account.name,
        description: line.description,
        amount: line.amount,
      }).from(line).leftJoin(account, eq(line.accountId, account.id))
        .where(eq(line.transactionId, input.transactionId)).all()
        .map(({ amount, accountType, ...rest }) => ({
          ...rest,
          accountType: accountType as AccountType | null,
          debit: amount > 0 ? amount : null,
          credit: amount < 0 ? Math.abs(amount) : null,
        }))
      return { ...txn, lines }
    }),

  updateTransaction: protectedProcedure
    .input(z.object({
      bookId: z.number(),
      transactionId: z.number().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').refine(s => !isNaN(Date.parse(s)), 'Invalid date'),
      description: z.string().min(1, 'Description is required'),
      lines: z.array(z.object({
        id: z.number().optional(),
        accountId: z.number(),
        description: z.string(),
        amount: z.number().int(),
      })).min(2, 'A transaction must have at least two lines')
        .refine(ls => ls.reduce((sum, l) => sum + l.amount, 0) === 0, 'Transaction does not balance'),
    }))
    .mutation(async ({ input, ctx }) => {
      const book = await ctx.db.query.books.findFirst({
        where: and(eq(books.id, input.bookId), eq(books.userId, ctx.user.id)),
      })
      if (!book) throw new TRPCError({ code: 'NOT_FOUND', message: 'Book not found' })
      const bookDb = getBookDb(book.id)
      const accountIds = input.lines.map(l => l.accountId)
      const foundAccounts = bookDb.select({ id: account.id }).from(account).where(inArray(account.id, accountIds)).all()
      const foundIds = new Set(foundAccounts.map(a => a.id))
      const missing = accountIds.find(id => !foundIds.has(id))
      if (missing != null) throw new TRPCError({ code: 'BAD_REQUEST', message: `Account ${missing} not found in this book` })
      let txnId: number
      if (input.transactionId == null) {
        const inserted = bookDb.insert(transaction).values({ date: input.date, description: input.description }).returning().get()
        txnId = inserted.id
      } else {
        const existing = bookDb.select().from(transaction).where(eq(transaction.id, input.transactionId)).get()
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found' })
        bookDb.update(transaction).set({ date: input.date, description: input.description }).where(eq(transaction.id, input.transactionId)).run()
        txnId = input.transactionId
        const existingLines = bookDb.select({ id: line.id }).from(line).where(eq(line.transactionId, txnId)).all()
        const keptIds = new Set(input.lines.map(l => l.id).filter(id => id != null))
        for (const { id } of existingLines) {
          if (!keptIds.has(id)) bookDb.delete(line).where(eq(line.id, id)).run()
        }
      }
      for (const l of input.lines) {
        if (l.id != null) {
          bookDb.update(line).set({ accountId: l.accountId, description: l.description, amount: l.amount }).where(eq(line.id, l.id)).run()
        } else {
          bookDb.insert(line).values({ transactionId: txnId, accountId: l.accountId, description: l.description, amount: l.amount }).run()
        }
      }
      return { id: txnId }
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1, 'Name is required'), description: z.string().default(''), csvContent: z.string().optional() }))
    .mutation(({ input, ctx }) => {
      if (input.csvContent) {
        try {
          validateWaveCsv(input.csvContent)
        } catch (e) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: (e as Error).message })
        }
      }
      const book = ctx.db
        .insert(books)
        .values({ name: input.name, userId: ctx.user.id })
        .returning()
        .get()
      const bookDb = getBookDb(book.id)
      setKvp(bookDb, 'name', input.name)
      setKvp(bookDb, 'description', input.description)
      if (input.csvContent) {
        importWaveCsv(bookDb, input.csvContent)
      }
      return { id: book.id, name: book.name }
    }),
})
