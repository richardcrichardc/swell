import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(
  process.env.TOKEN_SECRET ?? 'dev-secret-change-in-production',
)

export interface TokenPayload {
  userId: number
  email: string
  name: string
  [key: string]: unknown
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}
