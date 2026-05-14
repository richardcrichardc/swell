import { randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import type { db as DbType } from './db'
import { users } from './db/schema'
import { signToken } from './token'

const scryptAsync = promisify(scrypt)

type Db = typeof DbType

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':')
  const hashBuffer = Buffer.from(hash, 'hex')
  const derived = (await scryptAsync(password, salt, 64)) as Buffer
  return timingSafeEqual(hashBuffer, derived)
}

export async function loginUser(db: Db, input: { email: string; password: string }) {
  const user = await db.query.users.findFirst({ where: eq(users.email, input.email) })
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid email or password' })
  }
  const token = await signToken({ userId: user.id, email: user.email, name: user.name })
  return { user: { email: user.email, name: user.name }, token }
}

export async function registerUser(db: Db, input: { name: string; email: string; password: string }) {
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) })
  if (existing) {
    throw new TRPCError({ code: 'CONFLICT', message: 'An account with that email already exists' })
  }
  const passwordHash = await hashPassword(input.password)
  const user = db.insert(users).values({ email: input.email, name: input.name, passwordHash }).returning().get()
  const token = await signToken({ userId: user.id, email: user.email, name: user.name })
  return { user: { email: user.email, name: user.name }, token }
}
