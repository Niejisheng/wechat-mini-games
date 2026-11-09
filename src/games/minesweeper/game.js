const { createGameSession } = require('../../app/game-session')
const controllerModule = require('./controller')

function createMinesweeperRuntime(logic) {
  const runtime = { board: [], boardRows: 9, mineCount: 10, status: 'idle', active: false, boardCommitted: false, initialBoard: null, finalBoard: null, clickHistory: [], replay: null, startedAt: 0, elapsedSeconds: 0, difficultyIndex: 0, timer: null, failureSequence: null, explodedMine: null, winCelebration: null, winCelebrationRunning: false, revealEffects: [], revealAnimationRunning: false, collapseEffects: [], flagAnimation: null, numberFeedback: null, pressedArrow: '', difficultyFrom: 0, difficultyTo: 0, difficultyProgress: 1, arrowEffect: { side: '', phase: 'idle', progress: 1, rotation: 0 }, startPressed: false, startPressAt: 0, startLongPress: false, boardX: 20, boardY: 150, cellSize: 36, audioContext: null }
  runtime.stopTimer = () => { if (runtime.timer) clearTimeout(runtime.timer); runtime.timer = null }
  runtime.resetSession = () => {
    runtime.stopTimer()
    runtime.active = false
    runtime.status = 'idle'
    runtime.startedAt = 0
    runtime.elapsedSeconds = 0
    runtime.flagAnimation = null
    runtime.collapseEffects = []
  }
  runtime.initBoard = (difficulty, columns) => {
    runtime.stopTimer()
    runtime.boardRows = difficulty.rows
    runtime.mineCount = difficulty.mines
    runtime.failureSequence = null
    runtime.explodedMine = null
    runtime.winCelebration = null
    runtime.winCelebrationRunning = false
    runtime.revealEffects = []
    runtime.revealAnimationRunning = false
    runtime.status = 'playing'
    runtime.boardCommitted = false
    runtime.initialBoard = null
    runtime.finalBoard = null
    runtime.clickHistory = []
    runtime.replay = null
    runtime.startedAt = 0
    runtime.elapsedSeconds = 0
    runtime.collapseEffects = []
    runtime.flagAnimation = null
    runtime.numberFeedback = null
    runtime.board = logic.createBoard(runtime.difficultyIndex)
  }
  runtime.resetForReplay = () => {
    runtime.stopTimer()
    runtime.failureSequence = null
    runtime.explodedMine = null
    runtime.winCelebration = null
    runtime.winCelebrationRunning = false
    runtime.revealEffects = []
    runtime.revealAnimationRunning = false
    runtime.status = 'playing'
    runtime.boardCommitted = true
    runtime.clickHistory = []
    runtime.replay = null
    runtime.startedAt = 0
    runtime.elapsedSeconds = 0
    runtime.collapseEffects = []
    runtime.numberFeedback = null
    runtime.flagAnimation = null
    runtime.board.forEach(row => row.forEach(cell => { cell.open = false; cell.flag = false }))
  }
  runtime.neighbors = (row, col, columns) => logic.neighbors(row, col, runtime.boardRows, columns)
  runtime.startTimer = (isActive, draw) => { runtime.stopTimer(); const tick = () => { if (!isActive() || runtime.status !== 'playing' || !runtime.startedAt) return; runtime.elapsedSeconds = Math.floor((Date.now() - runtime.startedAt) / 1000); draw(); runtime.timer = setTimeout(tick, 1000) }; tick() }
  return runtime
}

function createMinesweeperGame({ draw, controller, enter, exit, destroy }) {
  return { id: 'minesweeper', ...createGameSession({ draw, controller, enter, exit, destroy }) }
}

function createMinesweeperController(deps) {
  return controllerModule.createController(deps)
}

module.exports = { createMinesweeperGame, createMinesweeperRuntime, createMinesweeperController }
