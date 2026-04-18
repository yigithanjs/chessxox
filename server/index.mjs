import { WebSocket, WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT ?? 2567)
const BOARD_SIZE = 3
const DRAW_PLY_LIMIT = 60
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

const rooms = new Map()
const wss = new WebSocketServer({ port: PORT })

wss.on('connection', (socket) => {
  socket.roomId = null
  socket.playerSide = null

  socket.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString())
      handleMessage(socket, message)
    } catch {
      sendError(socket, 'Invalid room message.')
    }
  })

  socket.on('close', () => {
    detachSocket(socket)
  })

  socket.on('error', () => {
    detachSocket(socket)
  })
})

console.log(`Chessxox room server listening on ws://127.0.0.1:${PORT}`)

function handleMessage(socket, message) {
  if (message.type === 'create_room') {
    createRoom(socket)
    return
  }

  if (message.type === 'join_room') {
    joinRoom(socket, message.roomId)
    return
  }

  if (message.type === 'restart_room') {
    restartRoom(socket, message.roomId)
    return
  }

  if (message.type === 'play_action') {
    playAction(socket, message.roomId, message.action)
    return
  }

  sendError(socket, 'Unsupported room message.')
}

function createRoom(socket) {
  detachSocket(socket)

  let roomId = generateRoomId()

  while (rooms.has(roomId)) {
    roomId = generateRoomId()
  }

  const room = {
    id: roomId,
    state: createInitialGameState(),
    players: {
      white: socket,
      black: null,
    },
  }

  rooms.set(roomId, room)
  socket.roomId = roomId
  socket.playerSide = 'white'
  broadcastRoomState(room, 'Room created. Share the link.')
}

function joinRoom(socket, roomId) {
  const normalizedRoomId = String(roomId || '').trim().toUpperCase()

  if (!normalizedRoomId) {
    sendError(socket, 'Room code is missing.')
    return
  }

  const room = rooms.get(normalizedRoomId)

  if (!room) {
    sendError(socket, `Room ${normalizedRoomId} was not found.`)
    return
  }

  if (socket.roomId === normalizedRoomId) {
    sendRoomState(socket, room)
    return
  }

  detachSocket(socket)

  if (!room.players.white) {
    room.players.white = socket
    socket.playerSide = 'white'
  } else if (!room.players.black) {
    room.players.black = socket
    socket.playerSide = 'black'
  } else {
    sendError(socket, `Room ${normalizedRoomId} is already full.`)
    return
  }

  socket.roomId = normalizedRoomId
  broadcastRoomState(room, `${capitalize(socket.playerSide)} joined ${normalizedRoomId}.`)
}

function playAction(socket, roomId, action) {
  const room = getRoom(socket, roomId)

  if (!room) {
    return
  }

  if (!socket.playerSide) {
    sendError(socket, 'You are not assigned to a side in this room.')
    return
  }

  if (room.state.currentPlayer !== socket.playerSide) {
    sendError(socket, 'It is not your turn.')
    return
  }

  try {
    room.state = applyAction(room.state, action)
    broadcastRoomState(room, `${capitalize(socket.playerSide)} moved.`)
  } catch (error) {
    sendError(socket, error instanceof Error ? error.message : 'Move rejected.')
  }
}

function restartRoom(socket, roomId) {
  const room = getRoom(socket, roomId)

  if (!room) {
    return
  }

  room.state = createInitialGameState()
  broadcastRoomState(room, 'Match restarted.')
}

function getRoom(socket, roomId) {
  const normalizedRoomId = String(roomId || socket.roomId || '').trim().toUpperCase()

  if (!normalizedRoomId) {
    sendError(socket, 'No room is active.')
    return null
  }

  const room = rooms.get(normalizedRoomId)

  if (!room) {
    sendError(socket, `Room ${normalizedRoomId} no longer exists.`)
    return null
  }

  return room
}

function detachSocket(socket) {
  if (!socket.roomId) {
    return
  }

  const room = rooms.get(socket.roomId)

  if (!room) {
    socket.roomId = null
    socket.playerSide = null
    return
  }

  if (room.players.white === socket) {
    room.players.white = null
  }

  if (room.players.black === socket) {
    room.players.black = null
  }

  const previousRoomId = socket.roomId
  socket.roomId = null
  socket.playerSide = null

  if (!room.players.white && !room.players.black) {
    rooms.delete(previousRoomId)
    return
  }

  broadcastRoomState(room, 'A player left the room.')
}

function sendRoomState(socket, room, overrideMessage) {
  if (socket.readyState !== WebSocket.OPEN) {
    return
  }

  socket.send(
    JSON.stringify({
      type: 'room_state',
      roomId: room.id,
      playerSide: socket.playerSide,
      players: {
        white: Boolean(room.players.white),
        black: Boolean(room.players.black),
      },
      roomStatus: room.players.white && room.players.black ? 'ready' : 'waiting',
      message:
        overrideMessage ??
        (room.players.white && room.players.black
          ? `Room ${room.id} - ${capitalize(room.state.currentPlayer)} to move.`
          : `Room ${room.id} - Waiting for both players.`),
      state: room.state,
    }),
  )
}

function broadcastRoomState(room, overrideMessage) {
  for (const socket of [room.players.white, room.players.black]) {
    if (socket) {
      sendRoomState(socket, room, overrideMessage)
    }
  }
}

function sendError(socket, message) {
  if (socket.readyState !== WebSocket.OPEN) {
    return
  }

  socket.send(
    JSON.stringify({
      type: 'error',
      message,
    }),
  )
}

function createInitialGameState() {
  const state = {
    board: Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null),
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

function serializeState(state) {
  const boardKey = state.board
    .map((cell) => {
      if (cell === 'white') return 'w'
      if (cell === 'black') return 'b'
      return '.'
    })
    .join('')

  return `${state.currentPlayer}:${boardKey}`
}

function opponentOf(player) {
  return player === 'white' ? 'black' : 'white'
}

function findWinningLine(board) {
  for (const line of WINNING_LINES) {
    const [first, second, third] = line
    const occupant = board[first]

    if (occupant && occupant === board[second] && occupant === board[third]) {
      return line
    }
  }

  return null
}

function getLegalActions(state, player = state.currentPlayer) {
  if (state.result !== 'ongoing') {
    return []
  }

  const captures = []
  const moves = []

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

  const drops = state.board.flatMap((cell, index) =>
    cell === null
      ? [
          {
            type: 'drop',
            to: index,
          },
        ]
      : [],
  )

  return [...captures, ...moves, ...drops]
}

function applyAction(state, action) {
  const legalActions = getLegalActions(state, state.currentPlayer)

  if (!legalActions.some((candidate) => isSameAction(candidate, action))) {
    throw new Error('Illegal action.')
  }

  const nextBoard = [...state.board]

  if (action.type === 'drop') {
    nextBoard[action.to] = state.currentPlayer
  } else {
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
  const provisionalState = {
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

  if (repetitionCounts[repetitionKey] >= 3 || provisionalState.plyCount >= DRAW_PLY_LIMIT) {
    return {
      ...provisionalState,
      repetitionCounts,
      result: 'draw',
    }
  }

  return {
    ...provisionalState,
    repetitionCounts,
  }
}

function isSameAction(left, right) {
  return left.type === right.type && left.from === right.from && left.to === right.to
}

function toRowCol(index) {
  return {
    row: Math.floor(index / BOARD_SIZE),
    col: index % BOARD_SIZE,
  }
}

function toIndex(row, col) {
  return row * BOARD_SIZE + col
}

function isInside(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

function generateRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function capitalize(player) {
  return player === 'white' ? 'White' : 'Black'
}
