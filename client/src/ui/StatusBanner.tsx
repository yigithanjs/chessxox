import type { GameState, Player } from '../game/types'

type StatusBannerProps = {
  state: GameState
  mode: 'bot' | 'local' | 'online'
  humanSide: Player
  onlineNote?: string | null
}

export function StatusBanner({ state, mode, humanSide, onlineNote }: StatusBannerProps) {
  const isBotTurn = mode === 'bot' && state.result === 'ongoing' && state.currentPlayer !== humanSide

  return (
    <section className="status-banner" aria-live="polite">
      <span className="status-banner__pill">{buildMessage(state, isBotTurn, mode, onlineNote)}</span>
    </section>
  )
}

function buildMessage(
  state: GameState,
  isBotTurn: boolean,
  mode: 'bot' | 'local' | 'online',
  onlineNote?: string | null,
) {
  if (state.result === 'white_win') {
    return 'White wins.'
  }

  if (state.result === 'black_win') {
    return 'Black wins.'
  }

  if (state.result === 'draw') {
    return 'Draw.'
  }

  if (mode === 'online' && onlineNote) {
    return onlineNote
  }

  if (isBotTurn) {
    return 'Bot thinking.'
  }

  return `${labelFor(state.currentPlayer)} to move.`
}

function labelFor(player: Player) {
  return player === 'white' ? 'White' : 'Black'
}
