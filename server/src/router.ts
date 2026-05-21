import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from './trpc'
import { loginUser, registerUser } from './user'
import { booksRouter } from './books'
import type { AppRouter } from '../../shared/api'

export const appRouter: AppRouter = router({
  health: publicProcedure.query(() => ({ status: 'ok' as const })),

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

  books: booksRouter,
})

