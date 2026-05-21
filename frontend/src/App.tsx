import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import NotFoundPage from './pages/NotFoundPage'
import AllBooksPage from './pages/AllBooksPage'
import BookLayout from './components/BookLayout'
import BookPage from './pages/BookPage'
import ChartOfAccountsPage from './pages/ChartOfAccountsPage'
import JournalPage from './pages/JournalPage'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/books" element={<AllBooksPage />} />
        <Route path="/books/:id" element={<BookLayout />}>
          <Route index element={<BookPage />} />
          <Route path="accounts" element={<ChartOfAccountsPage />} />
          <Route path="journal" element={<JournalPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}
