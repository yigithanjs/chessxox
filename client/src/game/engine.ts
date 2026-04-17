import type { Action, Cell, GameResult, GameState, Player } from './types'

export const BOARD_SIZE = 3
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE
export const DRAW_PLY_LIMIT = 60

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export function createInitialGameState(): GameState {
  const state: GameState = {
    board: Array.from({ length: CELL_COUNT }, () => null),
    currentPlayer: 'white',
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

export function opponentOf(player: Player): Player {
  return player === 'white' ? 'black' : 'white'
}

export function serializeState(state: Pick<GameState, 'board' | 'currentPlayer'>): string {
  const boardKey = state.board
    .map((cell) => {
      if (cell === 'white') return 'w'
      if (cell === 'black') return 'b'
      return '.'
    })
    .join('')

  return `${state.currentPlayer}:${boardKey}`
}

export function findWinningLine(board: Cell[]): number[] | null {
  for (const line of WINNING_LINES) {
    const [first, second, third] = line
    const occupant = board[first]

    if (occupant !== null && occupant === board[second] && occupant === board[third]) {
      return line
    }
  }

  return null
}

export function getGameResult(state: GameState): GameResult {
  return state.result
}

export function getLegalActions(
  state: Pick<GameState, 'board' | 'currentPlayer' | 'result'>,
  player: Player = state.currentPlayer,
): Action[] {
  if (state.result !== 'ongoing') {
    return []
  }

  const captures: Action[] = []
  const moves: Action[] = []

  state.board.forEach((cell, index) => {
    if (cell !== player) {
      return
    }

    const { row, col } = toRowCol(index)
    const direction = player === 'white' ? -1 : 1
    const forwardRow = row + direction

    if (isInside(forwardRow, col)) {
      const forwardIndex = toIndex(forwardRow, col)

      if (state.board[forwardIndex] === null) {
        moves.push({
          type: 'move',
          from: index,
          to: forwardIndex,
        })
      }

      for (const captureCol of [col - 1, col + 1]) {
        if (!isInside(forwardRow, captureCol)) {
          continue
        }

        const captureIndex = toIndex(forwardRow, captureCol)

        if (state.board[captureIndex] === opponentOf(player)) {
          captures.push({
            type: 'capture',
            from: index,
            to: captureIndex,
          })
        }
      }
    }
  })

  if (captures.length > 0) {
    return captures
  }

  const drops: Action[] = state.board.flatMap((cell, index) =>
    cell === null
      ? [
          {
            type: 'drop' as const,
            to: index,
          },
        ]
      : [],
  )

  return [...moves, ...drops]
}

export function applyAction(state: GameState, action: Action): GameState {
  if (state.result !== 'ongoing') {
    throw new Error('Cannot apply an action to a finished game.')
  }

  const legalActions = getLegalActions(state, state.currentPlayer)

  if (!legalActions.some((candidate) => isSameAction(candidate, action))) {
    throw new Error('Illegal action.')
  }

  const nextBoard = [...state.board]

  if (action.type === 'drop') {
    nextBoard[action.to] = state.currentPlayer
  } else {
    if (action.from === undefined) {
      throw new Error('Move and capture actions require a source square.')
    }

    nextBoard[action.from] = null
    nextBoard[action.to] = state.currentPlayer
  }

  const winnerLine = findWinningLine(nextBoard)

  if (winnerLine) {
    return {
      board: nextBoard,
      currentPlayer: state.currentPlayer,
      result: `${state.currentPlayer}_win`,
      winnerLine,
      repetitionCounts: state.repetitionCounts,
      plyCount: state.plyCount + 1,
    }
  }

  const nextPlayer = opponentOf(state.currentPlayer)
  const provisionalState: GameState = {
    board: nextBoard,
    currentPlayer: nextPlayer,
    result: 'ongoing',
    winnerLine: null,
    repetitionCounts: state.repetitionCounts,
    plyCount: state.plyCount + 1,
  }

  const repetitionKey = serializeState(provisionalState)
  const repetitionCounts = {
    ...state.repetitionCounts,
    [repetitionKey]: (state.repetitionCounts[repetitionKey] ?? 0) + 1,
  }

  const resolvedState: GameState = {
    ...provisionalState,
    repetitionCounts,
  }

  const noLegalActions = getLegalActions(resolvedState, nextPlayer).length === 0
  const repeatedPosition = repetitionCounts[repetitionKey] >= 3
  const moveLimitReached = resolvedState.plyCount >= DRAW_PLY_LIMIT

  if (noLegalActions || repeatedPosition || moveLimitReached) {
    return {
      ...resolvedState,
      result: 'draw',
    }
  }

  return resolvedState
}

function isSameAction(left: Action, right: Action): boolean {
  return left.type === right.type && left.from === right.from && left.to === right.to
}

function toRowCol(index: number) {
  return {
    row: Math.floor(index / BOARD_SIZE),
    col: index % BOARD_SIZE,
  }
}

function toIndex(row: number, col: number) {
  return row * BOARD_SIZE + col
}

function isInside(row: number, col: number) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}
