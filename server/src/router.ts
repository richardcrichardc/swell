import { z } from 'zod'
import { eq, asc } from 'drizzle-orm'
import { router, publicProcedure, protectedProcedure } from './trpc'
import { books } from './db/schema'
import { loginUser, registerUser } from './user'

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: 'ok' })),

  me: protectedProcedure.query(({ ctx }) => ({
    user: { email: ctx.user.email, name: ctx.user.name },
  })),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(({ input, ctx }) => loginUser(ctx.db, input)),

  register: publicProcedure
    .input(z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email(),
      password: z.string().min(8, 'Password must be at least 8 characters'),
    }))
    .mutation(({ input, ctx }) => registerUser(ctx.db, input)),

  books: router({
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
  }),
})

export type AppRouter = typeof appRouter
