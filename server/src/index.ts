import express from 'express'
import cors from 'cors'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './router'
import { createContext } from './trpc'

const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
})

app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
