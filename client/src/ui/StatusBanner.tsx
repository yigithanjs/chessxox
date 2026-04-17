import type { Action, GameState, Player } from '../game/types'

type StatusBannerProps = {
  state: GameState
  legalActions: Action[]
  mode: 'bot' | 'local' | 'online'
  humanSide: Player
  onlineNote?: string | null
}

export function StatusBanner({ state, legalActions, mode, humanSide, onlineNote }: StatusBannerProps) {
  const forcedCapture = legalActions.some((action) => action.type === 'capture')
  const isBotTurn = mode === 'bot' && state.result === 'ongoing' && state.currentPlayer !== humanSide
  const turnLabel = labelFor(state.currentPlayer)

  return (
    <section className="status-banner" aria-live="polite">
      <h1>Chessxox</h1>
      <p className="status-banner__message">
        {buildMessage(state, turnLabel, forcedCapture, isBotTurn, mode, onlineNote)}
      </p>
    </section>
  )
}

function buildMessage(
  state: GameState,
  turnLabel: string,
  forcedCapture: boolean,
  isBotTurn: boolean,
  mode: 'bot' | 'local' | 'online',
  onlineNote?: string | null,
) {
  if (state.result === 'white_win') {
    return 'White aligned three pawns and wins the match.'
  }

  if (state.result === 'black_win') {
    return 'Black aligned three pawns and wins the match.'
  }

  if (state.result === 'draw') {
    return 'Draw. The game repeated, locked up, or ran into the move cap.'
  }

  if (mode === 'online' && onlineNote) {
    if (onlineNote === 'Create a room or open a room link to play online.') {
      return ''
    }

    return onlineNote
  }

  if (isBotTurn) {
    return forcedCapture
      ? `${turnLabel} bot to move. A capture is forced.`
      : `${turnLabel} bot is thinking.`
  }

  if (forcedCapture) {
    return `${turnLabel} to move. Capture is mandatory this turn.`
  }

  return `${turnLabel} to move. Drop a pawn or move one already on the board.`
}

function labelFor(player: Player) {
  return player === 'white' ? 'White' : 'Black'
}
