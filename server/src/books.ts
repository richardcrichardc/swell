import { z } from 'zod'
import { eq, asc, and } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from './trpc'
import { books } from './db/schema'
import { getBookDb, getKvp, setKvp } from './db/bookDb'

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

  setDescription: protectedProcedure
    .input(z.object({ id: z.number(), description: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const book = await ctx.db.query.books.findFirst({
        where: and(eq(books.id, input.id), eq(books.userId, ctx.user.id)),
      })
      if (!book) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Book not found' })
      }
      setKvp(getBookDb(book.id), 'description', input.description)
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1, 'Name is required') }))
    .mutation(({ input, ctx }) => {
      const book = ctx.db
        .insert(books)
        .values({ name: input.name, userId: ctx.user.id })
        .returning()
        .get()
      setKvp(getBookDb(book.id), 'name', input.name)
      return { id: book.id, name: book.name }
    }),
})
