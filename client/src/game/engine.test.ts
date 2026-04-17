import { describe, expect, test } from 'vitest'
import {
  applyAction,
  createInitialGameState,
  DRAW_PLY_LIMIT,
  findWinningLine,
  getLegalActions,
  serializeState,
} from './engine'
import type { Cell, GameState, Player } from './types'

describe('engine', () => {
  test('detects winning rows, columns, and diagonals', () => {
    expect(findWinningLine(['white', 'white', 'white', null, null, null, null, null, null])).toEqual([
      0, 1, 2,
    ])
    expect(findWinningLine(['black', null, null, 'black', null, null, 'black', null, null])).toEqual([
      0, 3, 6,
    ])
    expect(findWinningLine(['white', null, null, null, 'white', null, null, null, 'white'])).toEqual([
      0, 4, 8,
    ])
  })

  test('allows nine opening drops on an empty board', () => {
    const state = createInitialGameState()

    expect(getLegalActions(state, 'white')).toHaveLength(9)
    expect(getLegalActions(state, 'white').every((action) => action.type === 'drop')).toBe(true)
  })

  test('handles forward pushes when a pawn is blocked or free', () => {
    const freeState = makeState({
      board: [null, null, null, null, null, null, null, 'white', null],
      currentPlayer: 'white',
    })

    const blockedState = makeState({
      board: [null, null, null, null, 'black', null, null, 'white', null],
      currentPlayer: 'white',
    })

    expect(getLegalActions(freeState, 'white')).toContainEqual({ type: 'move', from: 7, to: 4 })
    expect(getLegalActions(blockedState, 'white')).not.toContainEqual({ type: 'move', from: 7, to: 4 })
  })

  test('generates diagonal captures for both colors', () => {
    const whiteState = makeState({
      board: [null, null, null, 'black', null, 'black', null, 'white', null],
      currentPlayer: 'white',
    })
    const blackState = makeState({
      board: [null, 'black', null, 'white', null, 'white', null, null, null],
      currentPlayer: 'black',
    })

    expect(getLegalActions(whiteState, 'white')).toEqual([
      { type: 'capture', from: 7, to: 3 },
      { type: 'capture', from: 7, to: 5 },
    ])
    expect(getLegalActions(blackState, 'black')).toEqual([
      { type: 'capture', from: 1, to: 3 },
      { type: 'capture', from: 1, to: 5 },
    ])
  })

  test('forced capture suppresses pushes and drops', () => {
    const state = makeState({
      board: [null, null, null, 'black', null, null, null, 'white', null],
      currentPlayer: 'white',
    })

    expect(getLegalActions(state, 'white')).toEqual([{ type: 'capture', from: 7, to: 3 }])
  })

  test('switches turns after drop, move, and capture', () => {
    const afterDrop = applyAction(createInitialGameState(), { type: 'drop', to: 4 })

    expect(afterDrop.currentPlayer).toBe('black')

    const moveState = makeState({
      board: [null, null, null, null, null, null, null, 'white', null],
      currentPlayer: 'white',
    })
    const afterMove = applyAction(moveState, { type: 'move', from: 7, to: 4 })

    expect(afterMove.currentPlayer).toBe('black')

    const captureState = makeState({
      board: [null, null, null, 'black', null, null, null, 'white', null],
      currentPlayer: 'white',
    })
    const afterCapture = applyAction(captureState, { type: 'capture', from: 7, to: 3 })

    expect(afterCapture.currentPlayer).toBe('black')
  })

  test('declares draws on repetition and on the move cap', () => {
    const repeatedState = makeState({
      board: [null, 'black', null, null, null, null, null, 'white', null],
      currentPlayer: 'white',
      repetitionCounts: {
        'white:.b.....w.': 1,
        'black:.b..w....': 2,
      },
    })

    const afterRepetition = applyAction(repeatedState, { type: 'move', from: 7, to: 4 })

    expect(afterRepetition.result).toBe('draw')

    const moveCapState = makeState({
      board: [null, null, null, null, null, null, null, 'white', null],
      currentPlayer: 'white',
      plyCount: DRAW_PLY_LIMIT - 1,
    })

    const afterMoveCap = applyAction(moveCapState, { type: 'move', from: 7, to: 4 })

    expect(afterMoveCap.result).toBe('draw')
  })

  test('keeps a non-terminal state legally playable for the side to move', () => {
    const state = makeState({
      board: ['white', 'black', null, null, null, null, null, null, null],
      currentPlayer: 'white',
    })

    expect(getLegalActions(state, state.currentPlayer).length).toBeGreaterThan(0)
  })
})

function makeState({
  board,
  currentPlayer,
  plyCount = 0,
  repetitionCounts,
}: {
  board: Cell[]
  currentPlayer: Player
  plyCount?: number
  repetitionCounts?: Record<string, number>
}): GameState {
  const state: GameState = {
    board,
    currentPlayer,
    result: 'ongoing',
    winnerLine: null,
    repetitionCounts: {},
    plyCount,
  }

  return {
    ...state,
    repetitionCounts: repetitionCounts ?? {
      [serializeState(state)]: 1,
    },
  }
}
