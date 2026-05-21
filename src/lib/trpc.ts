import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../../shared/api'
import { useAuthStore } from '../store/useAuthStore'

export const trpc = createTRPCReact<AppRouter>()

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/trpc',
      headers: () => {
        const token = useAuthStore.getState().token
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
    }),
  ],
})
