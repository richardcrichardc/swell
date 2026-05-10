import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../../server/src/router'
import { useAuthStore } from '../store/useAuthStore'

export const trpc = createTRPCReact<AppRouter>()

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.PROD ? '/trpc' : 'http://localhost:3001/trpc',
      headers: () => {
        const token = useAuthStore.getState().token
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
    }),
  ],
})
