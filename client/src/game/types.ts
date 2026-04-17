export type Player = 'white' | 'black'

export type Cell = Player | null

export type Action = {
  type: 'drop' | 'move' | 'capture'
  from?: number
  to: number
}

export type GameResult = 'ongoing' | 'white_win' | 'black_win' | 'draw'

export type GameState = {
  board: Cell[]
  currentPlayer: Player
  result: GameResult
  winnerLine: number[] | null
  repetitionCounts: Record<string, number>
  plyCount: number
}
