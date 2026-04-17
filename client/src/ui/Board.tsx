import type { Action, Cell } from '../game/types'

type BoardProps = {
  board: Cell[]
  legalActions: Action[]
  selectedCell: number | null
  winnerLine: number[] | null
  disabled: boolean
  orientation?: 'white' | 'black'
  onCellClick: (index: number) => void
}

const WHITE_PAWN = '\u2659'
const BLACK_PAWN = '\u265F'

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
        {getDisplayIndexes(orientation).map((boardIndex) => {
          const cell = board[boardIndex]
          const squareName = indexToSquare(boardIndex)
          const classes = [
            'board-cell',
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
              <span className="board-cell__coord">{squareName}</span>
              {cell ? (
                <span className={`piece piece--${cell}`} aria-hidden="true">
                  {cell === 'white' ? WHITE_PAWN : BLACK_PAWN}
                </span>
              ) : (
                <span className="board-cell__hint" aria-hidden="true">
                  {captureTargets.has(boardIndex)
                    ? 'x'
                    : dropTargets.has(boardIndex) || moveTargets.has(boardIndex)
                      ? '.'
                      : ''}
                </span>
              )}
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
