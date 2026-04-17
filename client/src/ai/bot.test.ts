import { describe, expect, test } from 'vitest'
import { getLegalActions, serializeState } from '../game/engine'
import type { Cell, GameState, Player } from '../game/types'
import { chooseEasyMove, chooseHardMove } from './bot'

describe('bot', () => {
  test('hard bot takes an immediate win', () => {
    const state = makeState({
      board: ['white', 'white', null, null, null, null, null, null, null],
      currentPlayer: 'white',
    })

    expect(chooseHardMove(state)).toEqual({ type: 'drop', to: 2 })
  })

  test('hard bot blocks the opponent when a block exists', () => {
    const state = makeState({
      board: ['white', 'white', null, null, 'black', null, null, null, null],
      currentPlayer: 'black',
    })

    expect(chooseHardMove(state)).toEqual({ type: 'drop', to: 2 })
  })

  test('easy bot always returns a legal move', () => {
    const state = makeState({
      board: [null, null, null, null, null, null, null, 'white', null],
      currentPlayer: 'white',
    })

    expect(getLegalActions(state, 'white')).toContainEqual(chooseEasyMove(state))
  })
})

function makeState({
  board,
  currentPlayer,
}: {
  board: Cell[]
  currentPlayer: Player
}): GameState {
  const state: GameState = {
    board,
    currentPlayer,
    result: 'ongoing',
    winnerLine: null,
    repetitionCounts: {},
    plyCount: 0,
  }

  return {
    ...state,
    repetitionCounts: {
      [serializeState(state)]: 1,
    },
  }
}
