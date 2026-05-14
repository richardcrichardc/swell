import { z } from 'zod'
import { eq, asc } from 'drizzle-orm'
import { router, protectedProcedure } from './trpc'
import { books } from './db/schema'

export const booksRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userBooks = await ctx.db.query.books.findMany({
      where: eq(books.userId, ctx.user.userId),
      orderBy: [asc(books.createdAt)],
    })
    return userBooks.map((b) => ({ id: b.id, name: b.name }))
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1, 'Name is required') }))
    .mutation(({ input, ctx }) => {
      const book = ctx.db
        .insert(books)
        .values({ name: input.name, userId: ctx.user.userId })
        .returning()
        .get()
      return { id: book.id, name: book.name }
    }),
})
