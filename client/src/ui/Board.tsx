import type { Action, Cell } from '../game/types'
import whitePawn from '../assets/white-pawn.svg'
import blackPawn from '../assets/black-pawn.svg'

type BoardProps = {
  board: Cell[]
  legalActions: Action[]
  selectedCell: number | null
  winnerLine: number[] | null
  disabled: boolean
  orientation?: 'white' | 'black'
  onCellClick: (index: number) => void
}

export function Board({
  board,
  legalActions,
  selectedCell,
  winnerLine,
  disabled,
  orientation = 'white',
  onCellClick,
}: BoardProps) {
  const winnerSet = new Set(winnerLine ?? [])
  const winLine = buildWinLine(winnerLine, orientation)
  const selectableCells = new Set(
    legalActions.filter((action) => action.from !== undefined).map((action) => action.from),
  )
  const dropTargets = new Set(
    selectedCell === null
      ? legalActions.filter((action) => action.type === 'drop').map((action) => action.to)
      : [],
  )
  const moveTargets = new Set(
    selectedCell === null
      ? []
      : legalActions
          .filter((action) => action.from === selectedCell && action.type === 'move')
          .map((action) => action.to),
  )
  const captureTargets = new Set(
    selectedCell === null
      ? []
      : legalActions
          .filter((action) => action.from === selectedCell && action.type === 'capture')
          .map((action) => action.to),
  )

  return (
    <section className="board-shell" aria-label="Chessxox board">
      <div className="board">
        {winLine ? (
          <svg className="board__win-line" viewBox="0 0 3 3" preserveAspectRatio="none" aria-hidden="true">
            <line x1={winLine.x1} y1={winLine.y1} x2={winLine.x2} y2={winLine.y2} />
          </svg>
        ) : null}
        {getDisplayIndexes(orientation).map((boardIndex) => {
          const cell = board[boardIndex]
          const squareName = indexToSquare(boardIndex)
          const classes = [
            'board-cell',
            isLightSquare(boardIndex) ? 'board-cell--light' : 'board-cell--dark',
            cell ? `board-cell--${cell}` : 'board-cell--empty',
            selectedCell === boardIndex ? 'is-selected' : '',
            selectableCells.has(boardIndex) ? 'is-selectable' : '',
            dropTargets.has(boardIndex) ? 'is-drop-target' : '',
            moveTargets.has(boardIndex) ? 'is-move-target' : '',
            captureTargets.has(boardIndex) ? 'is-capture-target' : '',
            winnerSet.has(boardIndex) ? 'is-winning' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={squareName}
              type="button"
              className={classes}
              onClick={() => onCellClick(boardIndex)}
              disabled={disabled}
              aria-label={buildCellLabel(squareName, cell, selectedCell === boardIndex)}
            >
              {cell ? (
                <img
                  className={`piece piece--${cell}`}
                  src={cell === 'white' ? whitePawn : blackPawn}
                  alt=""
                  aria-hidden="true"
                  draggable="false"
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function buildCellLabel(squareName: string, cell: Cell, isSelected: boolean) {
  const piece = cell ? `${cell} pawn` : 'empty'
  const selected = isSelected ? ', selected' : ''

  return `Cell ${squareName}, ${piece}${selected}`
}

function indexToSquare(index: number) {
  const file = String.fromCharCode(97 + (index % 3))
  const rank = 3 - Math.floor(index / 3)

  return `${file}${rank}`
}

function getDisplayIndexes(orientation: 'white' | 'black') {
  const indexes = Array.from({ length: 9 }, (_, index) => index)

  return orientation === 'black' ? indexes.reverse() : indexes
}

function isLightSquare(index: number) {
  const row = Math.floor(index / 3)
  const col = index % 3

  return (row + col) % 2 === 0
}

function buildWinLine(winnerLine: number[] | null, orientation: 'white' | 'black') {
  if (!winnerLine || winnerLine.length < 3) {
    return null
  }

  const start = toDisplayPoint(winnerLine[0], orientation)
  const end = toDisplayPoint(winnerLine[2], orientation)

  return {
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
  }
}

function toDisplayPoint(index: number, orientation: 'white' | 'black') {
  const row = Math.floor(index / 3)
  const col = index % 3
  const displayRow = orientation === 'black' ? 2 - row : row
  const displayCol = orientation === 'black' ? 2 - col : col

  return {
    x: displayCol + 0.5,
    y: displayRow + 0.5,
  }
}
