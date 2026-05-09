import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-gray-500">Page not found.</p>
      <Link to="/" className="text-blue-600 underline hover:text-blue-800">
        Go home
      </Link>
    </main>
  )
}
