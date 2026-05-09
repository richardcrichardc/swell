import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { useAppStore } from '../store/useAppStore'

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
    expect(screen.getByText('Swell')).toBeInTheDocument()
  })

  it('renders the 404 page for unknown routes', () => {
    renderApp('/does-not-exist')
    expect(screen.getByText('404')).toBeInTheDocument()
  })
})

describe('Counter', () => {
  beforeEach(() => {
    useAppStore.getState().reset()
  })

  it('increments the count', async () => {
    const user = userEvent.setup()
    renderApp()
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+' }))
    expect(screen.getByText('Count: 1')).toBeInTheDocument()
  })

  it('decrements the count', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: '+' }))
    await user.click(screen.getByRole('button', { name: '-' }))
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
  })

  it('resets the count', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: '+' }))
    await user.click(screen.getByRole('button', { name: '+' }))
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
  })
})
