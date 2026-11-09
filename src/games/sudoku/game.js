const { createGameSession } = require('../../app/game-session')
const controllerModule = require('./controller')

function createSudokuRuntime(logic) {
  const runtime = { game: logic.gameFromPuzzle(), mode: 'menu', difficultyIndex: 0, difficultyFrom: 0, difficultyTo: 0, difficultyProgress: 1, pressedArrow: '', arrowEffect: { side: '', phase: 'idle', progress: 1, rotation: 0 }, celebration: null, celebrationAt: 0, startPressed: false, startPressAt: 0, elapsedSeconds: 0, timer: null, boardX: 20, boardY: 150, cellSize: 36 }
  runtime.startTimer = (isActive, draw) => { runtime.stopTimer(); runtime.elapsedSeconds = 0; runtime.timer = setInterval(() => { if (isActive() && !runtime.game.won) { runtime.elapsedSeconds += 1; draw() } }, 1000) }
  runtime.stopTimer = () => { if (runtime.timer) clearInterval(runtime.timer); runtime.timer = null }
  runtime.reset = (puzzle = logic.gameFromPuzzle()) => {
    runtime.game = puzzle
    runtime.mode = 'menu'
    runtime.elapsedSeconds = 0
    runtime.celebration = null
    runtime.celebrationAt = 0
  }
  runtime.start = puzzle => { runtime.game = puzzle; runtime.mode = 'playing'; runtime.elapsedSeconds = 0 }
  return runtime
}

function createSudokuGame({ draw, controller, enter, exit, destroy }) {
  return { id: 'sudoku', ...createGameSession({ draw, controller, enter, exit, destroy }) }
}

function createSudokuController(deps) {
  return controllerModule.createController(deps)
}

module.exports = { createSudokuGame, createSudokuRuntime, createSudokuController }
