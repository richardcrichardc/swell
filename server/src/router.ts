import { z } from 'zod'
import { eq, asc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from './trpc'
import { users, books } from './db/schema'
import { hashPassword, verifyPassword } from './password'
import { signToken } from './token'

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: 'ok' })),

  me: protectedProcedure.query(({ ctx }) => ({
    user: { email: ctx.user.email, name: ctx.user.name },
  })),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      })

      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid email or password' })
      }

      const token = await signToken({ userId: user.id, email: user.email, name: user.name })
      return { user: { email: user.email, name: user.name }, token }
    }),

  register: publicProcedure
    .input(z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email(),
      password: z.string().min(8, 'Password must be at least 8 characters'),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      })

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'An account with that email already exists' })
      }

      const passwordHash = await hashPassword(input.password)

      const user = ctx.db.insert(users)
        .values({ email: input.email, name: input.name, passwordHash })
        .returning()
        .get()

      const token = await signToken({ userId: user.id, email: user.email, name: user.name })
      return { user: { email: user.email, name: user.name }, token }
    }),

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
