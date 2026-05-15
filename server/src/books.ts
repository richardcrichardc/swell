import { z } from 'zod'
import { eq, asc, and } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from './trpc'
import { books } from './db/schema'
import { getBookDb, getKvp, setKvp, account, transaction, line } from './db/bookDb'
import { validateWaveCsv, importWaveCsv } from './waveImport'
import { AccountType, AccountTypeSign } from '../../shared/accounts'

export const booksRouter = router({
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
      return bookDb.select().from(account).orderBy(asc(account.type), asc(account.name)).all()
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
      const rawLines = bookDb.select({
        id: line.id,
        transactionId: line.transactionId,
        accountName: account.name,
        accountType: account.type,
        description: line.description,
        amount: line.amount,
        salesTaxAmount: line.salesTaxAmount,
      }).from(line).leftJoin(account, eq(line.accountId, account.id)).all()
      const lines = rawLines.map(({ amount, accountType, ...rest }) => {
        const sign = AccountTypeSign[(accountType ?? '') as AccountType] ?? 1
        const isDebit = amount * sign > 0
        return { ...rest, debit: isDebit ? Math.abs(amount) : null, credit: isDebit ? null : Math.abs(amount) }
      })
      const linesByTxn = new Map<number, typeof lines>()
      for (const l of lines) {
        const arr = linesByTxn.get(l.transactionId) ?? []
        arr.push(l)
        linesByTxn.set(l.transactionId, arr)
      }
      return txns.map(txn => ({ ...txn, lines: linesByTxn.get(txn.id) ?? [] }))
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
