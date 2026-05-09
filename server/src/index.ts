import express from 'express'
import cors from 'cors'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './router'

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
  }),
)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
