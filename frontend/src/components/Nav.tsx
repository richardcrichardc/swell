import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useMatch, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { trpc } from '../lib/trpc'

export default function Nav() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const bookMatch = useMatch('/books/:id/*')
  const bookId = bookMatch ? Number(bookMatch.params.id) : null
  const { data: book } = trpc.books.get.useQuery({ id: bookId! }, { enabled: bookId != null })
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    void navigate('/')
  }

  return (
    <nav className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900">
            <img src="/favicon.svg" alt="Swell logo" className="h-7 w-7" />
            Swell
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-gray-600"
              >
                {book?.name ?? 'No book selected'}
                <span className="text-gray-400">▾</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  <div className="border-b border-gray-100 px-4 py-2 text-sm text-gray-500">{user.name}</div>
                  <NavLink
                    to="/books"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    All Books
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`
                }
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
