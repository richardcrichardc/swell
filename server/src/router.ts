import { z } from 'zod'
import { router, publicProcedure } from './trpc'

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: 'ok' })),

  greeting: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => `Hello, ${input.name}!`),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(({ input }) => ({
      user: {
        email: input.email,
        name: input.email.split('@')[0],
      },
    })),
})

export type AppRouter = typeof appRouter
