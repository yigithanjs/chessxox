import { applyAction, getLegalActions, getGameResult, opponentOf, serializeState } from '../game/engine'
import type { Action, GameState, Player } from '../game/types'

const WIN_SCORE = 1000

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
  let bestAction = actions[0]
  let bestScore = Number.NEGATIVE_INFINITY

  for (const action of orderActions(state, actions, rootPlayer)) {
    const candidateState = applyAction(state, action)
    const score = search(candidateState, rootPlayer, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, cache)

    if (score > bestScore) {
      bestScore = score
      bestAction = action
    }
  }

  return bestAction
}

function search(
  state: GameState,
  rootPlayer: Player,
  alpha: number,
  beta: number,
  cache: Map<string, number>,
): number {
  if (state.result !== 'ongoing') {
    return scoreTerminal(state, rootPlayer)
  }

  const cacheKey = buildSearchKey(state)
  const cached = cache.get(cacheKey)

  if (cached !== undefined) {
    return cached
  }

  const actions = getLegalActions(state, state.currentPlayer)
  const maximizing = state.currentPlayer === rootPlayer
  let bestScore = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY

  for (const action of orderActions(state, actions, rootPlayer)) {
    const candidateState = applyAction(state, action)
    const score = search(candidateState, rootPlayer, alpha, beta, cache)

    if (maximizing) {
      bestScore = Math.max(bestScore, score)
      alpha = Math.max(alpha, score)
    } else {
      bestScore = Math.min(bestScore, score)
      beta = Math.min(beta, score)
    }

    if (beta <= alpha) {
      break
    }
  }

  cache.set(cacheKey, bestScore)

  return bestScore
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

function buildSearchKey(state: GameState): string {
  const repetitions = Object.entries(state.repetitionCounts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}=${count}`)
    .join('|')

  return `${serializeState(state)}#${state.plyCount}#${repetitions}`
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
