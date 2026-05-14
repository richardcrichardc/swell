import { initTRPC, TRPCError } from '@trpc/server'
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { ZodError } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { users } from './db/schema'
import { verifyToken } from './token'

export const createContext = async ({ req }: CreateExpressContextOptions) => {
  const authHeader = req.headers.authorization
  const rawToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const payload = rawToken ? await verifyToken(rawToken) : null
  const user = payload
    ? (await db.query.users.findFirst({ where: eq(users.id, payload.userId) })) ?? null
    : null
  return { db, user }
}

export type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create({
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    message:
      error.cause instanceof ZodError
        ? (error.cause.errors[0]?.message ?? 'Invalid input')
        : shape.message,
  }),
})

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(isAuthed)
