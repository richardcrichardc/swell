import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from './trpc'
import { users } from './db/schema'

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: 'ok' })),

  greeting: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => `Hello, ${input.name}!`),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      })

      if (!user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid email or password' })
      }

      return { user: { email: user.email, name: user.name } }
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

      const user = ctx.db.insert(users)
        .values({ email: input.email, name: input.name })
        .returning()
        .get()

      return { user: { email: user.email, name: user.name } }
    }),
})

export type AppRouter = typeof appRouter
