const { createGameSession } = require('../../app/game-session')

function createSudokuRuntime(logic) {
  const runtime = { game: logic.gameFromPuzzle(), elapsedSeconds: 0, timer: null }
  runtime.startTimer = (isActive, draw) => { runtime.stopTimer(); runtime.elapsedSeconds = 0; runtime.timer = setInterval(() => { if (isActive() && !runtime.game.won) { runtime.elapsedSeconds += 1; draw() } }, 1000) }
  runtime.stopTimer = () => { if (runtime.timer) clearInterval(runtime.timer); runtime.timer = null }
  return runtime
}

function createSudokuGame({ draw, controller, enter, exit }) {
  return { id: 'sudoku', ...createGameSession({ draw, controller, enter, exit }) }
}

module.exports = { createSudokuGame, createSudokuRuntime }
