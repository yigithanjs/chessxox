import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import App from './App'

describe('App', () => {
  test('renders the board and places a pawn after a player move', async () => {
    render(<App />)

    expect(screen.getAllByRole('button', { name: /cell/i })).toHaveLength(9)

    fireEvent.click(screen.getByRole('button', { name: /cell a1, empty/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cell a1, white pawn/i })).toBeInTheDocument()
    })
  })

  test('lets the bot answer after the human move', async () => {
    vi.useFakeTimers()

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /cell b2, empty/i }))
    act(() => {
      vi.runOnlyPendingTimers()
    })

    expect(screen.getAllByRole('button', { name: /black pawn/i }).length).toBeGreaterThanOrEqual(1)

    vi.useRealTimers()
  })

  test('restart clears the match state', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /cell c1, empty/i }))
    fireEvent.click(screen.getByRole('button', { name: /restart match/i }))

    expect(screen.getAllByRole('button', { name: /empty/i })).toHaveLength(9)
  })

  test('changing mode resets the board', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /cell a2, empty/i }))
    fireEvent.click(screen.getByRole('button', { name: /game mode/i }))
    fireEvent.click(screen.getByRole('option', { name: /local 2p/i }))

    expect(screen.getAllByRole('button', { name: /empty/i })).toHaveLength(9)
    expect(screen.getByText(/white to move/i)).toBeInTheDocument()
  })

  test('music starts off and can be toggled on', () => {
    render(<App />)

    const toggle = screen.getByRole('button', { name: /music off/i })

    fireEvent.click(toggle)

    expect(screen.getByRole('button', { name: /music on/i })).toBeInTheDocument()
  })
})
