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

function createMinesweeperBoardRenderer({ runtime, logic, view, width, height, text, drawWin, drawResult }) {
  return function drawBoard() {
    const replayLayout = runtime.status === 'won' && runtime.difficultyIndex >= 2
    const maxWidth = replayLayout ? Math.min(width - 36, 330) : Math.min(width - 36, 360)
    const reservedTop = 112
    const reservedBottom = replayLayout ? 180 : 148
    const availableHeight = Math.max(180, height - reservedTop - reservedBottom)
    const widthCellSize = maxWidth / logic.BOARD_COLUMNS
    const heightCellSize = availableHeight / runtime.boardRows
    runtime.cellSize = Math.min(widthCellSize, heightCellSize)
    const boardWidth = runtime.cellSize * logic.BOARD_COLUMNS
    const gap = Math.max(4, boardWidth * 0.012)
    runtime.boardX = (width - boardWidth) / 2
    const boardHeight = runtime.cellSize * runtime.boardRows
    runtime.boardY = Math.max(96, reservedTop + (height - reservedTop - reservedBottom - boardHeight) / 2)
    view.drawBackArrow(26, 72)
    text(String(runtime.mineCount - logic.countFlags(runtime.board)), width / 2 + 1, 82, 18, '#667483', 'left')
    text(`${runtime.elapsedSeconds}s`, width / 2, 106, 18, '#667483', 'center')
    for (let row = 0; row < runtime.boardRows; row += 1) for (let col = 0; col < logic.BOARD_COLUMNS; col += 1) {
      const cell = runtime.board[row][col]
      const x = runtime.boardX + col * runtime.cellSize
      const y = runtime.boardY + row * runtime.cellSize
      view.drawCell({ cell, x, y, cellSize: runtime.cellSize, gap, row, col, effect: runtime.collapseEffects.find(item => item.r === row && item.c === col), flagFx: runtime.flagAnimation && runtime.flagAnimation.r === row && runtime.flagAnimation.c === col ? runtime.flagAnimation : null, exploded: runtime.explodedMine && runtime.explodedMine.r === row && runtime.explodedMine.c === col, failure: runtime.failureSequence, revealEffect: runtime.revealEffects.find(item => item.r === row && item.c === col), drawFlyingFlag: view.drawFlyingFlag, drawMineExplosion: (cx, cy) => view.drawMineExplosion({ x: cx, y: cy, cellSize: runtime.cellSize, progress: runtime.failureSequence ? Math.min(1, Math.max(0, (Date.now() - runtime.failureSequence.at) / 520)) : 1 }), drawRevealOverlay: view.drawRevealOverlay })
    }
    if (runtime.status === 'won') runtime.winCelebrationRunning ? drawWin() : drawResult(true)
    else if (runtime.status === 'lost') drawResult(false)
  }
}

module.exports = { createMinesweeperGame, createMinesweeperRuntime, createMinesweeperController, createMinesweeperBoardRenderer }
