import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import HomePage from '../pages/HomePage'

describe('HomePage', () => {
  it('shows the landing page', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Swell Accounting' })).toBeInTheDocument()
  })
})
