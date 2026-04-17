import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { createInitialGameState } from '../game/engine'
import type { Action, GameState, Player } from '../game/types'

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error'
type RoomStatus = 'idle' | 'waiting' | 'ready'

type RoomPresence = {
  white: boolean
  black: boolean
}

type RoomStateMessage = {
  type: 'room_state'
  roomId: string
  playerSide: Player | null
  players: RoomPresence
  roomStatus: RoomStatus
  message: string
  state: GameState
}

type ErrorMessage = {
  type: 'error'
  message: string
}

type ServerMessage = RoomStateMessage | ErrorMessage

type ClientMessage =
  | { type: 'create_room' }
  | { type: 'join_room'; roomId: string }
  | { type: 'play_action'; roomId: string; action: Action }
  | { type: 'restart_room'; roomId: string }

type OnlineRoomState = {
  connectionState: ConnectionState
  roomStatus: RoomStatus
  roomId: string | null
  playerSide: Player | null
  players: RoomPresence
  gameState: GameState | null
  message: string
  inviteLink: string | null
}

const EMPTY_PRESENCE: RoomPresence = {
  white: false,
  black: false,
}

const INITIAL_ONLINE_STATE: OnlineRoomState = {
  connectionState: 'idle',
  roomStatus: 'idle',
  roomId: null,
  playerSide: null,
  players: EMPTY_PRESENCE,
  gameState: createInitialGameState(),
  message: 'Create a room or open a room link to play online.',
  inviteLink: null,
}

export function useOnlineRoom(enabled: boolean) {
  const [session, setSession] = useState<OnlineRoomState>(INITIAL_ONLINE_STATE)
  const socketRef = useRef<WebSocket | null>(null)
  const pendingMessagesRef = useRef<ClientMessage[]>([])
  const attemptedRoomRef = useRef<string | null>(null)
  const manualCloseRef = useRef(false)
  const autoJoinRoom = useEffectEvent((roomId: string) => {
    joinRoom(roomId)
  })
  const autoDisconnect = useEffectEvent(() => {
    disconnect(false)
  })

  useEffect(() => {
    if (!enabled) {
      autoDisconnect()
      return
    }

    const roomIdFromUrl = readRoomFromUrl()

    if (!roomIdFromUrl) {
      return
    }

    if (session.roomId === roomIdFromUrl || attemptedRoomRef.current === roomIdFromUrl) {
      return
    }

    attemptedRoomRef.current = roomIdFromUrl
    autoJoinRoom(roomIdFromUrl)
  }, [enabled, session.roomId])

  function connectAndQueue(message: ClientMessage) {
    const existingSocket = socketRef.current

    if (existingSocket?.readyState === WebSocket.OPEN) {
      existingSocket.send(JSON.stringify(message))
      return
    }

    pendingMessagesRef.current.push(message)
    ensureSocket()
  }

  function ensureSocket() {
    const existingSocket = socketRef.current

    if (
      existingSocket &&
      (existingSocket.readyState === WebSocket.OPEN || existingSocket.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    manualCloseRef.current = false
    const socket = new WebSocket(getWebSocketUrl())
    socketRef.current = socket

    setSession((current) => ({
      ...current,
      connectionState: 'connecting',
      message: current.roomId ? 'Connecting back to the room server...' : 'Connecting to the room server...',
    }))

    socket.addEventListener('open', () => {
      setSession((current) => ({
        ...current,
        connectionState: 'connected',
      }))

      const queuedMessages = [...pendingMessagesRef.current]
      pendingMessagesRef.current = []

      for (const queuedMessage of queuedMessages) {
        socket.send(JSON.stringify(queuedMessage))
      }
    })

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data) as ServerMessage

      if (message.type === 'error') {
        setSession((current) => ({
          ...current,
          connectionState: 'error',
          message: message.message,
        }))
        return
      }

      attemptedRoomRef.current = message.roomId
      writeRoomToUrl(message.roomId)
      setSession({
        connectionState: 'connected',
        roomStatus: message.roomStatus,
        roomId: message.roomId,
        playerSide: message.playerSide,
        players: message.players,
        gameState: message.state,
        message: message.message,
        inviteLink: buildInviteLink(message.roomId),
      })
    })

    socket.addEventListener('close', () => {
      socketRef.current = null

      if (manualCloseRef.current) {
        manualCloseRef.current = false
        return
      }

      setSession((current) => ({
        ...current,
        connectionState: current.roomId ? 'error' : 'idle',
        roomStatus: current.roomId ? current.roomStatus : 'idle',
        message: current.roomId
          ? 'Connection to the room server was lost. Use reconnect to join again.'
          : 'Online room connection closed.',
      }))
    })

    socket.addEventListener('error', () => {
      setSession((current) => ({
        ...current,
        connectionState: 'error',
        message: 'Could not reach the room server. Start the WebSocket server first.',
      }))
    })
  }

  function createRoom() {
    attemptedRoomRef.current = null
    setSession((current) => ({
      ...current,
      connectionState: 'connecting',
      message: 'Creating an online room...',
    }))
    connectAndQueue({ type: 'create_room' })
  }

  function joinRoom(roomId: string) {
    const normalizedRoomId = roomId.trim().toUpperCase()

    if (!normalizedRoomId) {
      return
    }

    setSession((current) => ({
      ...current,
      roomId: normalizedRoomId,
      connectionState: 'connecting',
      message: `Joining room ${normalizedRoomId}...`,
    }))
    connectAndQueue({ type: 'join_room', roomId: normalizedRoomId })
  }

  function reconnect() {
    const roomId = session.roomId ?? readRoomFromUrl()

    if (!roomId) {
      setSession((current) => ({
        ...current,
        message: 'No room link is active yet.',
      }))
      return
    }

    disconnect(false)
    attemptedRoomRef.current = null
    joinRoom(roomId)
  }

  function leaveRoom() {
    attemptedRoomRef.current = null
    disconnect(true)
  }

  function playAction(action: Action) {
    if (!session.roomId) {
      return
    }

    connectAndQueue({
      type: 'play_action',
      roomId: session.roomId,
      action,
    })
  }

  function restartRoom() {
    if (!session.roomId) {
      return
    }

    connectAndQueue({
      type: 'restart_room',
      roomId: session.roomId,
    })
  }

  function disconnect(clearUrl: boolean) {
    const socket = socketRef.current
    manualCloseRef.current = true
    pendingMessagesRef.current = []

    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close()
    }

    socketRef.current = null

    if (clearUrl) {
      writeRoomToUrl(null)
    }

    setSession({
      ...INITIAL_ONLINE_STATE,
      message: clearUrl ? 'Left the online room.' : INITIAL_ONLINE_STATE.message,
      gameState: createInitialGameState(),
    })
  }

  return {
    ...session,
    createRoom,
    reconnect,
    leaveRoom,
    playAction,
    restartRoom,
  }
}

function getWebSocketUrl() {
  const customUrl = import.meta.env.VITE_WS_URL

  if (customUrl) {
    return customUrl
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.hostname || '127.0.0.1'
  const port = import.meta.env.VITE_WS_PORT ?? '2567'

  return `${protocol}//${host}:${port}`
}

function buildInviteLink(roomId: string) {
  const inviteUrl = new URL(window.location.href)
  inviteUrl.searchParams.set('room', roomId)

  return inviteUrl.toString()
}

function readRoomFromUrl() {
  const roomId = new URL(window.location.href).searchParams.get('room')

  return roomId?.trim().toUpperCase() || null
}

function writeRoomToUrl(roomId: string | null) {
  const currentUrl = new URL(window.location.href)

  if (roomId) {
    currentUrl.searchParams.set('room', roomId)
  } else {
    currentUrl.searchParams.delete('room')
  }

  window.history.replaceState({}, '', currentUrl)
}
