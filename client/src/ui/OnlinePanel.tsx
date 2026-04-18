import type { Player } from '../game/types'

type OnlinePanelProps = {
  roomId: string | null
  inviteLink: string | null
  playerSide: Player | null
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
  connectionState,
  roomStatus,
  message,
  onCreateRoom,
  onReconnect,
  onCopyInvite,
  onLeaveRoom,
}: OnlinePanelProps) {
  return (
    <section className="online-strip" aria-label="Online room controls">
      <div className="online-strip__chips">
        <span className={connectionState === 'connected' ? 'online-chip is-live' : 'online-chip'}>
          {readableConnection(connectionState)}
        </span>
        <span className="online-chip">{roomId ?? 'No room'}</span>
        <span className="online-chip">{roomStatus === 'ready' ? 'Ready' : 'Waiting'}</span>
        <span className="online-chip">{playerSide ? readablePlayer(playerSide) : 'Unassigned'}</span>
      </div>

      <div className="online-strip__actions">
        <button type="button" className="control-chip control-chip--button" onClick={onCreateRoom}>
          {roomId ? 'New room' : 'Create room'}
        </button>
        <button
          type="button"
          className="control-chip control-chip--button"
          onClick={onCopyInvite}
          disabled={!inviteLink}
        >
          Copy link
        </button>
        <button
          type="button"
          className="control-chip control-chip--button"
          onClick={onReconnect}
          disabled={!roomId && !inviteLink}
        >
          Reconnect
        </button>
        <button
          type="button"
          className="control-chip control-chip--button"
          onClick={onLeaveRoom}
          disabled={!roomId && !inviteLink}
        >
          Leave
        </button>
      </div>

      <p className="online-strip__message">{message}</p>
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
