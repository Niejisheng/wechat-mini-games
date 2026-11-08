const assert = require('assert')
const logic = require('../src/games/minesweeper/logic')

let seed = 17
function random() {
  seed = (seed * 1103515245 + 12345) % 2147483648
  return seed / 2147483648
}

logic.DIFFICULTIES.forEach((difficulty, index) => {
  const board = logic.createBoard(index, random)
  assert.strictEqual(board.length, difficulty.rows)
  assert.ok(board.every(row => row.length === logic.BOARD_COLUMNS))
  assert.strictEqual(board.flat().filter(cell => cell.mine).length, difficulty.mines)
  board.forEach((row, rowIndex) => row.forEach((cell, colIndex) => {
    const expected = logic.neighbors(rowIndex, colIndex, difficulty.rows)
      .filter(([nextRow, nextCol]) => board[nextRow][nextCol].mine).length
    assert.strictEqual(cell.number, expected)
  }))
})

const sample = logic.createBoard(0, random)
sample[0][0].flag = true
sample[0][1].open = true
assert.strictEqual(logic.countFlags(sample), 1)
assert.strictEqual(logic.countSafeRemaining(sample), sample.flat().filter(cell => !cell.mine && !cell.open).length)

const safeBoard = logic.createBoard(4, random, [[8, 4], ...logic.neighbors(8, 4, 17)])
const safeCells = [[8, 4], ...logic.neighbors(8, 4, 17)]
safeCells.forEach(([row, col]) => assert.strictEqual(safeBoard[row][col].mine, false))
assert.strictEqual(safeBoard.flat().filter(cell => cell.mine).length, logic.DIFFICULTIES[4].mines)
const cloned = logic.cloneBoard(safeBoard)
cloned[0][0].open = !cloned[0][0].open
assert.notStrictEqual(cloned[0][0].open, safeBoard[0][0].open)

console.log('minesweeper logic tests passed')
