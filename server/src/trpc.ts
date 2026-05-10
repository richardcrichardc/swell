import { initTRPC } from '@trpc/server'
import { db } from './db'

export const createContext = () => ({ db })
export type Context = ReturnType<typeof createContext>

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
