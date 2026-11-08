const BOARD_COLUMNS = 9

const DIFFICULTIES = [
  { name: '容易', rows: 9, mines: 10 },
  { name: '中等', rows: 11, mines: 17 },
  { name: '标准', rows: 13, mines: 25 },
  { name: '困难', rows: 15, mines: 38 },
  { name: '极难', rows: 15, mines: 45 }
]

function getDifficulty(index) {
  return DIFFICULTIES[Math.max(0, Math.min(DIFFICULTIES.length - 1, index))]
}

function neighbors(row, col, rows, columns = BOARD_COLUMNS) {
  const result = []
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      const nextRow = row + dr
      const nextCol = col + dc
      if ((dr || dc) && nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < columns) {
        result.push([nextRow, nextCol])
      }
    }
  }
  return result
}

function createBoard(difficultyIndex, random = Math.random, safeCells = []) {
  const difficulty = getDifficulty(difficultyIndex)
  const safe = new Set(safeCells.map(([row, col]) => `${row},${col}`))
  const board = Array.from({ length: difficulty.rows }, () => (
    Array.from({ length: BOARD_COLUMNS }, () => ({ mine: false, number: 0, open: false, flag: false }))
  ))
  let placed = 0
  while (placed < difficulty.mines) {
    const row = Math.floor(random() * difficulty.rows)
    const col = Math.floor(random() * BOARD_COLUMNS)
    if (!board[row][col].mine && !safe.has(`${row},${col}`)) {
      board[row][col].mine = true
      placed += 1
    }
  }
  for (let row = 0; row < difficulty.rows; row += 1) {
    for (let col = 0; col < BOARD_COLUMNS; col += 1) {
      board[row][col].number = neighbors(row, col, difficulty.rows)
        .filter(([nextRow, nextCol]) => board[nextRow][nextCol].mine).length
    }
  }
  return board
}

function countFlags(board) {
  return board.reduce((total, row) => total + row.filter(cell => cell.flag).length, 0)
}

function countSafeRemaining(board) {
  return board.reduce((total, row) => total + row.filter(cell => !cell.mine && !cell.open).length, 0)
}

module.exports = {
  BOARD_COLUMNS,
  DIFFICULTIES,
  getDifficulty,
  neighbors,
  createBoard,
  countFlags,
  countSafeRemaining
}
