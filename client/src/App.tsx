import { startTransition, useEffect, useState } from 'react'
import './App.css'
import { chooseEasyMove, chooseHardMove } from './ai/bot'
import { applyAction, createInitialGameState, getLegalActions } from './game/engine'
import { useOnlineRoom } from './online/useOnlineRoom'
import type { Action, Player } from './game/types'
import { Board } from './ui/Board'
import { Controls } from './ui/Controls'
import { OnlinePanel } from './ui/OnlinePanel'
import { RulesPanel } from './ui/RulesPanel'
import { StatusBanner } from './ui/StatusBanner'

type GameMode = 'bot' | 'local' | 'online'
type BotDifficulty = 'easy' | 'hard'
type HumanSide = 'white' | 'black'

const EMPTY_GAME_STATE = createInitialGameState()

function App() {
  const [mode, setMode] = useState<GameMode>(() => (hasRoomQuery() ? 'online' : 'bot'))
  const [difficulty, setDifficulty] = useState<BotDifficulty>('easy')
  const [humanSide, setHumanSide] = useState<HumanSide>('white')
  const [offlineGameState, setOfflineGameState] = useState(() => createInitialGameState())
  const [selectedCell, setSelectedCell] = useState<number | null>(null)
  const [copyFeedback, setCopyFeedback] = useState('')

  const onlineRoom = useOnlineRoom(mode === 'online')
  const gameState = mode === 'online' ? onlineRoom.gameState ?? EMPTY_GAME_STATE : offlineGameState
  const legalActions = getLegalActions(gameState, gameState.currentPlayer)
  const boardOrientation =
    mode === 'bot'
      ? humanSide
      : mode === 'online' && onlineRoom.playerSide === 'black'
        ? 'black'
        : 'white'
  const activeSelectedCell =
    selectedCell !== null &&
    gameState.board[selectedCell] === gameState.currentPlayer &&
    legalActions.some((action) => action.from === selectedCell)
      ? selectedCell
      : null
  const isBotTurn =
    mode === 'bot' && gameState.result === 'ongoing' && gameState.currentPlayer !== humanSide
  const canInteract =
    gameState.result === 'ongoing' &&
    (mode === 'local' ||
      (mode === 'bot' && !isBotTurn) ||
      (mode === 'online' &&
        onlineRoom.connectionState === 'connected' &&
        onlineRoom.roomStatus === 'ready' &&
        onlineRoom.playerSide === gameState.currentPlayer))

  useEffect(() => {
    if (mode !== 'online') {
      startTransition(() => {
        setOfflineGameState(createInitialGameState())
        setSelectedCell(null)
      })
    }
  }, [mode, difficulty, humanSide])

  useEffect(() => {
    if (!isBotTurn) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setOfflineGameState((current) => {
        if (current.result !== 'ongoing' || current.currentPlayer === humanSide) {
          return current
        }

        const action = difficulty === 'hard' ? chooseHardMove(current) : chooseEasyMove(current)

        return applyAction(current, action)
      })
      setSelectedCell(null)
    }, 450)

    return () => window.clearTimeout(timeoutId)
  }, [difficulty, humanSide, isBotTurn])

  function handleAction(action: Action) {
    if (mode === 'online') {
      onlineRoom.playAction(action)
      setSelectedCell(null)
      return
    }

    startTransition(() => {
      setOfflineGameState((current) => applyAction(current, action))
      setSelectedCell(null)
    })
  }

  function handleRestart() {
    if (mode === 'online') {
      onlineRoom.restartRoom()
      setSelectedCell(null)
      return
    }

    startTransition(() => {
      setOfflineGameState(createInitialGameState())
      setSelectedCell(null)
    })
  }

  async function handleCopyInvite() {
    if (!onlineRoom.inviteLink) {
      return
    }

    try {
      await navigator.clipboard.writeText(onlineRoom.inviteLink)
      setCopyFeedback('Invite link copied.')
    } catch {
      setCopyFeedback('Copy failed. Use the room link manually.')
    }

    window.setTimeout(() => {
      setCopyFeedback('')
    }, 2200)
  }

  function handleCellClick(index: number) {
    if (!canInteract) {
      return
    }

    const cell = gameState.board[index]
    const canSelectPiece =
      cell === gameState.currentPlayer && legalActions.some((action) => action.from === index)

    if (activeSelectedCell !== null) {
      const selectedAction = legalActions.find(
        (action) => action.from === activeSelectedCell && action.to === index,
      )

      if (selectedAction) {
        handleAction(selectedAction)
        return
      }

      if (canSelectPiece) {
        setSelectedCell((current) => (current === index ? null : index))
        return
      }

      setSelectedCell(null)
      return
    }

    if (canSelectPiece) {
      setSelectedCell(index)
      return
    }

    const dropAction = legalActions.find((action) => action.type === 'drop' && action.to === index)

    if (dropAction) {
      handleAction(dropAction)
    }
  }

  function getOnlineNote() {
    if (mode !== 'online') {
      return null
    }

    if (!onlineRoom.roomId) {
      return onlineRoom.message
    }

    const sideLabel = onlineRoom.playerSide ? capitalizePlayer(onlineRoom.playerSide) : 'No side assigned'

    if (onlineRoom.roomStatus === 'waiting') {
      return `Room ${onlineRoom.roomId}. ${sideLabel}. Waiting for the other player to join.`
    }

    return `Room ${onlineRoom.roomId}. You are ${sideLabel}.`
  }

  return (
    <main className="app-shell">
      <section className="game-stage panel">
        <div className="game-stage__header">
          <StatusBanner
            state={gameState}
            legalActions={legalActions}
            mode={mode}
            humanSide={(mode === 'online' ? onlineRoom.playerSide : humanSide) ?? 'white'}
            onlineNote={getOnlineNote()}
          />
        </div>
        <div className="game-stage__board">
          <Board
            board={gameState.board}
            legalActions={legalActions}
            selectedCell={activeSelectedCell}
            winnerLine={gameState.winnerLine}
            disabled={!canInteract}
            orientation={boardOrientation}
            onCellClick={handleCellClick}
          />
        </div>
      </section>

      <aside className="sidebar">
        <Controls
          mode={mode}
          difficulty={difficulty}
          humanSide={humanSide}
          onModeChange={setMode}
          onDifficultyChange={setDifficulty}
          onHumanSideChange={setHumanSide}
          onRestart={handleRestart}
        />
        {mode === 'online' ? (
          <OnlinePanel
            roomId={onlineRoom.roomId}
            inviteLink={onlineRoom.inviteLink}
            playerSide={onlineRoom.playerSide}
            players={onlineRoom.players}
            connectionState={onlineRoom.connectionState}
            roomStatus={onlineRoom.roomStatus}
            message={copyFeedback || onlineRoom.message}
            onCreateRoom={onlineRoom.createRoom}
            onReconnect={onlineRoom.reconnect}
            onCopyInvite={handleCopyInvite}
            onLeaveRoom={onlineRoom.leaveRoom}
          />
        ) : null}
        <RulesPanel />
      </aside>
    </main>
  )
}

function capitalizePlayer(player: Player) {
  return player === 'white' ? 'White' : 'Black'
}

function hasRoomQuery() {
  return new URL(window.location.href).searchParams.has('room')
}

export default App
