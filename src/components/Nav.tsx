import { Link, NavLink } from 'react-router-dom'

export default function Nav() {
  return (
    <nav className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold tracking-tight text-gray-900">
            Swell
          </Link>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`
            }
          >
            Home
          </NavLink>
        </div>
        <div className="flex items-center gap-3">
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
        </div>
      </div>
    </nav>
  )
}
