import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { Board } from './Board'
import type { Action, Cell } from '../game/types'

describe('Board', () => {
  test('renders without visible coordinates or hint glyphs', () => {
    const actions: Action[] = []
    const board: Cell[] = [null, null, null, null, null, null, null, null, null]

    const { container } = render(
      <Board
        board={board}
        legalActions={actions}
        selectedCell={null}
        winnerLine={null}
        disabled={false}
        orientation="white"
        onCellClick={vi.fn()}
      />,
    )

    const buttons = screen.getAllByRole('button')

    expect(buttons).toHaveLength(9)
    expect(buttons.every((button) => button.textContent === '')).toBe(true)
    expect(container.querySelector('.board__win-line')).toBeNull()
  })

  test('shows a win line when a winning line is present', () => {
    render(
      <Board
        board={['white', 'white', 'white', null, null, null, null, null, null]}
        legalActions={[]}
        selectedCell={null}
        winnerLine={[0, 1, 2]}
        disabled={false}
        orientation="white"
        onCellClick={vi.fn()}
      />,
    )

    expect(document.querySelector('.board__win-line')).toBeInTheDocument()
  })
})
