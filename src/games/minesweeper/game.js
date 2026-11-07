const { createGameSession } = require('../../app/game-session')

function createMinesweeperRuntime(logic) {
  return { board: [], boardRows: 9, mineCount: 10, status: 'idle', startedAt: 0, elapsedSeconds: 0, difficultyIndex: 0, timer: null }
}

function createMinesweeperGame({ draw, controller, enter, exit }) {
  return { id: 'minesweeper', ...createGameSession({ draw, controller, enter, exit }) }
}

module.exports = { createMinesweeperGame, createMinesweeperRuntime }
