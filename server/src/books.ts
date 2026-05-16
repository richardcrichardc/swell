import { z } from 'zod'
import { eq, asc, and, count } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from './trpc'
import { books } from './db/schema'
import { getBookDb, getKvp, setKvp, account, transaction, line } from './db/bookDb'
import { validateWaveCsv, importWaveCsv } from './waveImport'

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
      return bookDb
        .select({ id: account.id, name: account.name, type: account.type, sortOrder: account.sortOrder, lineCount: count(line.id) })
        .from(account)
        .leftJoin(line, eq(line.accountId, account.id))
        .groupBy(account.id)
        .orderBy(asc(account.type), asc(account.sortOrder), asc(account.name))
        .all()
        .map(({ lineCount, ...rest }) => ({ ...rest, hasTransactions: lineCount > 0 }))
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
        .map(({ amount, ...rest }) => ({
          ...rest,
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
