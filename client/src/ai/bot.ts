import { applyAction, getLegalActions, getGameResult, opponentOf, serializeState } from '../game/engine'
import type { Action, GameState, Player } from '../game/types'

const WIN_SCORE = 1000
const HARD_BOT_MAX_DEPTH = 4
const HARD_BOT_TIME_BUDGET_MS = 45
const HARD_BOT_MAX_NODES = 2500
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

export function chooseEasyMove(state: GameState): Action {
  const actions = getLegalActions(state, state.currentPlayer)

  if (actions.length === 0) {
    throw new Error('No legal actions available for easy bot.')
  }

  const winningMoves = actions.filter((action) => isWinningMove(state, action, state.currentPlayer))

  if (winningMoves.length > 0) {
    return pickRandom(winningMoves)
  }

  const safeMoves = actions.filter((action) => !allowsImmediateLoss(state, action))

  if (safeMoves.length > 0) {
    return pickRandom(safeMoves)
  }

  return pickRandom(actions)
}

export function chooseHardMove(state: GameState): Action {
  const actions = getLegalActions(state, state.currentPlayer)

  if (actions.length === 0) {
    throw new Error('No legal actions available for hard bot.')
  }

  const cache = new Map<string, number>()
  const rootPlayer = state.currentPlayer
  const deadline = now() + HARD_BOT_TIME_BUDGET_MS
  const orderedActions = orderActions(state, actions, rootPlayer)
  let bestAction = orderedActions[0]

  for (let depth = 1; depth <= HARD_BOT_MAX_DEPTH; depth += 1) {
    const result = searchRoot(state, orderedActions, rootPlayer, depth, cache, deadline)

    if (result.aborted) {
      break
    }

    bestAction = result.bestAction
  }

  return bestAction
}

function searchRoot(
  state: GameState,
  actions: Action[],
  rootPlayer: Player,
  depth: number,
  cache: Map<string, number>,
  deadline: number,
): { bestAction: Action; aborted: boolean } {
  let bestAction = actions[0]
  let bestScore = Number.NEGATIVE_INFINITY
  let alpha = Number.NEGATIVE_INFINITY
  let aborted = false
  const nodes = { count: 0 }

  for (const action of actions) {
    const candidateState = applyAction(state, action)
    const result = search(candidateState, rootPlayer, depth - 1, alpha, Number.POSITIVE_INFINITY, cache, deadline, nodes)

    if (result.aborted) {
      aborted = true
      break
    }

    if (result.score > bestScore) {
      bestScore = result.score
      bestAction = action
    }

    alpha = Math.max(alpha, result.score)
  }

  return { bestAction, aborted }
}

function search(
  state: GameState,
  rootPlayer: Player,
  depthRemaining: number,
  alpha: number,
  beta: number,
  cache: Map<string, number>,
  deadline: number,
  nodes: { count: number },
): { score: number; aborted: boolean } {
  if (isSearchExpired(deadline, nodes)) {
    return { score: evaluateState(state, rootPlayer), aborted: true }
  }

  if (state.result !== 'ongoing') {
    return { score: scoreTerminal(state, rootPlayer), aborted: false }
  }

  if (depthRemaining <= 0) {
    return { score: evaluateState(state, rootPlayer), aborted: false }
  }

  const cacheKey = buildSearchKey(state, depthRemaining)
  const cached = cache.get(cacheKey)

  if (cached !== undefined) {
    return { score: cached, aborted: false }
  }

  const actions = getLegalActions(state, state.currentPlayer)
  const maximizing = state.currentPlayer === rootPlayer
  let bestScore = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY

  for (const action of orderActions(state, actions, rootPlayer)) {
    if (isSearchExpired(deadline, nodes)) {
      return { score: bestScore, aborted: true }
    }

    nodes.count += 1
    const candidateState = applyAction(state, action)
    const result = search(candidateState, rootPlayer, depthRemaining - 1, alpha, beta, cache, deadline, nodes)

    if (result.aborted) {
      return { score: result.score, aborted: true }
    }

    if (maximizing) {
      bestScore = Math.max(bestScore, result.score)
      alpha = Math.max(alpha, result.score)
    } else {
      bestScore = Math.min(bestScore, result.score)
      beta = Math.min(beta, result.score)
    }

    if (beta <= alpha) {
      break
    }
  }

  cache.set(cacheKey, bestScore)

  return { score: bestScore, aborted: false }
}

function scoreTerminal(state: GameState, rootPlayer: Player): number {
  const result = getGameResult(state)

  if (result === 'draw') {
    return 0
  }

  const winner = result === 'white_win' ? 'white' : 'black'

  if (winner === rootPlayer) {
    return WIN_SCORE - state.plyCount
  }

  return state.plyCount - WIN_SCORE
}

function buildSearchKey(state: GameState, depthRemaining: number): string {
  const repetitions = Object.entries(state.repetitionCounts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}=${count}`)
    .join('|')

  return `${serializeState(state)}#${state.plyCount}#${depthRemaining}#${repetitions}`
}

function orderActions(state: GameState, actions: Action[], player: Player): Action[] {
  return [...actions].sort((left, right) => scoreAction(state, right, player) - scoreAction(state, left, player))
}

function scoreAction(state: GameState, action: Action, player: Player): number {
  const nextState = applyAction(state, action)

  if (getGameResult(nextState) === `${player}_win`) {
    return 100
  }

  let score = 0

  if (action.type === 'capture') {
    score += 10
  }

  if (action.to === 4) {
    score += 4
  }

  if (action.type === 'drop') {
    score += 1
  }

  return score
}

function evaluateState(state: GameState, rootPlayer: Player): number {
  if (state.result !== 'ongoing') {
    return scoreTerminal(state, rootPlayer)
  }

  const opponent = opponentOf(rootPlayer)
  let score = 0

  for (let index = 0; index < state.board.length; index += 1) {
    const cell = state.board[index]

    if (cell === rootPlayer) {
      score += 6
    } else if (cell === opponent) {
      score -= 6
    }
  }

  if (state.board[4] === rootPlayer) {
    score += 4
  } else if (state.board[4] === opponent) {
    score -= 4
  }

  for (const line of WINNING_LINES) {
    const lineScore = scoreLine(state.board, line, rootPlayer, opponent)
    score += lineScore
  }

  return score
}

function scoreLine(board: GameState['board'], line: number[], rootPlayer: Player, opponent: Player) {
  let rootCount = 0
  let opponentCount = 0

  for (const index of line) {
    const cell = board[index]

    if (cell === rootPlayer) {
      rootCount += 1
    } else if (cell === opponent) {
      opponentCount += 1
    }
  }

  if (rootCount > 0 && opponentCount > 0) {
    return 0
  }

  if (rootCount === 2 && opponentCount === 0) {
    return 12
  }

  if (rootCount === 1 && opponentCount === 0) {
    return 4
  }

  if (opponentCount === 2 && rootCount === 0) {
    return -12
  }

  if (opponentCount === 1 && rootCount === 0) {
    return -4
  }

  return 0
}

function isWinningMove(state: GameState, action: Action, player: Player) {
  return getGameResult(applyAction(state, action)) === `${player}_win`
}

function allowsImmediateLoss(state: GameState, action: Action) {
  const candidateState = applyAction(state, action)
  const opponent = opponentOf(state.currentPlayer)
  const opponentActions = getLegalActions(candidateState, candidateState.currentPlayer)

  return opponentActions.some((response) => isWinningMove(candidateState, response, opponent))
}

function pickRandom(actions: Action[]): Action {
  return actions[Math.floor(Math.random() * actions.length)]
}

function isSearchExpired(deadline: number, nodes: { count: number }) {
  return now() >= deadline || nodes.count >= HARD_BOT_MAX_NODES
}

function now() {
  return globalThis.performance?.now() ?? Date.now()
}
