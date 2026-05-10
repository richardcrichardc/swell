import { initTRPC } from '@trpc/server'
import { ZodError } from 'zod'
import { db } from './db'

export const createContext = () => ({ db })
export type Context = ReturnType<typeof createContext>

const t = initTRPC.context<Context>().create({
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    message:
      error.cause instanceof ZodError
        ? (error.cause.errors[0]?.message ?? 'Invalid input')
        : shape.message,
  }),
})

export const router = t.router
export const publicProcedure = t.procedure
