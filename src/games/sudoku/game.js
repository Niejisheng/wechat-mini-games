const { createGameSession } = require('../../app/game-session')

function createSudokuRuntime(logic) {
  const runtime = { game: logic.gameFromPuzzle(), mode: 'menu', difficultyIndex: 0, difficultyFrom: 0, difficultyTo: 0, difficultyProgress: 1, pressedArrow: '', arrowEffect: { side: '', phase: 'idle', progress: 1, rotation: 0 }, celebration: null, celebrationAt: 0, startPressed: false, startPressAt: 0, elapsedSeconds: 0, timer: null, boardX: 20, boardY: 150, cellSize: 36 }
  runtime.startTimer = (isActive, draw) => { runtime.stopTimer(); runtime.elapsedSeconds = 0; runtime.timer = setInterval(() => { if (isActive() && !runtime.game.won) { runtime.elapsedSeconds += 1; draw() } }, 1000) }
  runtime.stopTimer = () => { if (runtime.timer) clearInterval(runtime.timer); runtime.timer = null }
  return runtime
}

function createSudokuGame({ draw, controller, enter, exit }) {
  return { id: 'sudoku', ...createGameSession({ draw, controller, enter, exit }) }
}

module.exports = { createSudokuGame, createSudokuRuntime }
