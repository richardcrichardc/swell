import { z } from 'zod'
import { router, publicProcedure } from './trpc'

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: 'ok' })),

  greeting: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => `Hello, ${input.name}!`),
})

export type AppRouter = typeof appRouter
