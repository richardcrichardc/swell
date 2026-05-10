import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import App from '../App'

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App', () => {
  it('renders the home page', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: 'Swell Accounting' })).toBeInTheDocument()
  })

  it('renders the 404 page for unknown routes', () => {
    renderApp('/does-not-exist')
    expect(screen.getByText('404')).toBeInTheDocument()
  })
})
