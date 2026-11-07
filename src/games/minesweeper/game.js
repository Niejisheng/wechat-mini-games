const { createGameSession } = require('../../app/game-session')

function createMinesweeperGame({ draw, controller, enter, exit }) {
  return { id: 'minesweeper', ...createGameSession({ draw, controller, enter, exit }) }
}

module.exports = { createMinesweeperGame }
