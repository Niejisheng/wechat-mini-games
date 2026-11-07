const { createGameSession } = require('../../app/game-session')

function createSudokuGame({ draw, controller, enter, exit }) {
  return { id: 'sudoku', ...createGameSession({ draw, controller, enter, exit }) }
}

module.exports = { createSudokuGame }
