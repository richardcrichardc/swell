import { NavLink, Outlet, useParams } from 'react-router-dom'

function sideNavClass({ isActive }: { isActive: boolean }) {
  return `block rounded px-3 py-2 text-sm ${isActive ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
}

export default function BookLayout() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="flex">
      <aside className="w-52 shrink-0 border-r border-gray-200 px-3 py-6" style={{ minHeight: 'calc(100vh - 4rem)' }}>
        <nav className="flex flex-col gap-1">
          <NavLink to={`/books/${id}`} end className={sideNavClass}>Dashboard</NavLink>
          <NavLink to={`/books/${id}/accounts`} className={sideNavClass}>Chart of Accounts</NavLink>
          <NavLink to={`/books/${id}/journal`} className={sideNavClass}>Journal</NavLink>
          <NavLink to={`/books/${id}/transactions`} className={sideNavClass}>Transactions</NavLink>
        </nav>
      </aside>
      <main className="flex-1 px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
