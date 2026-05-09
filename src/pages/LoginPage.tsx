import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { useAuthStore } from '../store/useAuthStore'
import Button from '../components/ui/Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()

  const login = trpc.login.useMutation({
    onSuccess: ({ user }) => {
      setUser(user)
      navigate('/')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login.mutate({ email, password })
  }

  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="mb-8 text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </p>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <a href="#" className="text-xs text-blue-600 hover:underline">
                Forgot password?
              </a>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {login.error && (
            <p className="text-sm text-red-600">{login.error.message}</p>
          )}

          <Button type="submit" disabled={login.isPending} className="w-full justify-center">
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </main>
  )
}
