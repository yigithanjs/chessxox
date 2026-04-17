import type { Player } from '../game/types'

type OnlinePanelProps = {
  roomId: string | null
  inviteLink: string | null
  playerSide: Player | null
  players: {
    white: boolean
    black: boolean
  }
  connectionState: 'idle' | 'connecting' | 'connected' | 'error'
  roomStatus: 'idle' | 'waiting' | 'ready'
  message: string
  onCreateRoom: () => void
  onReconnect: () => void
  onCopyInvite: () => void
  onLeaveRoom: () => void
}

export function OnlinePanel({
  roomId,
  inviteLink,
  playerSide,
  players,
  connectionState,
  roomStatus,
  message,
  onCreateRoom,
  onReconnect,
  onCopyInvite,
  onLeaveRoom,
}: OnlinePanelProps) {
  return (
    <section className="panel online-panel">
      <div className="panel__header">
        <p className="panel__eyebrow">Online Rooms</p>
        <h2>Share a link</h2>
      </div>

      <div className="online-summary">
        <p>
          <strong>Connection:</strong> {readableConnection(connectionState)}
        </p>
        <p>
          <strong>Room:</strong> {roomId ?? 'No active room'}
        </p>
        <p>
          <strong>Your side:</strong> {playerSide ? readablePlayer(playerSide) : 'Unassigned'}
        </p>
        <p>
          <strong>Match:</strong> {roomStatus === 'ready' ? 'Both players connected' : 'Waiting for opponent'}
        </p>
      </div>

      <div className="presence-list">
        <div className={players.white ? 'presence-pill is-online' : 'presence-pill'}>
          White {players.white ? 'connected' : 'missing'}
        </div>
        <div className={players.black ? 'presence-pill is-online' : 'presence-pill'}>
          Black {players.black ? 'connected' : 'missing'}
        </div>
      </div>

      <p className="online-panel__message">{message}</p>

      <div className="online-actions">
        <button type="button" className="action-button" onClick={onCreateRoom}>
          Create room
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onCopyInvite}
          disabled={!inviteLink}
        >
          Copy invite link
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onReconnect}
          disabled={!roomId && !inviteLink}
        >
          Reconnect
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onLeaveRoom}
          disabled={!roomId && !inviteLink}
        >
          Leave room
        </button>
      </div>
    </section>
  )
}

function readableConnection(state: OnlinePanelProps['connectionState']) {
  if (state === 'idle') return 'Idle'
  if (state === 'connecting') return 'Connecting'
  if (state === 'connected') return 'Connected'
  return 'Error'
}

function readablePlayer(player: Player) {
  return player === 'white' ? 'White' : 'Black'
}
