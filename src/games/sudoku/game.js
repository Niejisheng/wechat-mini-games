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

function createSudokuBoardRenderer({ ctx, runtime, view, logic, width, height, difficulties, drawDifficultySelector, drawChevron }) {
  return function drawBoard() {
    view.drawPageHeader({ elapsed: runtime.elapsedSeconds, difficulty: difficulties[runtime.difficultyIndex].name })
    const layout = view.layout()
    runtime.cellSize = layout.cellSize
    runtime.boardX = layout.boardX
    runtime.boardY = layout.boardY
    view.drawControls({ width, height, canUndo: runtime.game.history.length > 0, selected: runtime.game.selected, won: runtime.game.won })
    const filterY = runtime.boardY - 35
    view.drawFilterCaption({ y: filterY - 38 })
    view.drawFilterCards({ boardX: runtime.boardX, filterY, size: runtime.cellSize, filter: runtime.game.filter, values: runtime.game.values })
    const selected = runtime.game.selected
    const activeDigit = runtime.game.filter === null && selected !== null ? runtime.game.values[selected] : 0
    const errors = logic.conflicts(runtime.game.values)
    const searchMode = runtime.game.filter !== null
    for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) {
      const index = row * 9 + col
      const x = runtime.boardX + col * runtime.cellSize
      const y = runtime.boardY + row * runtime.cellSize
      const possible = runtime.game.filter !== null && !runtime.game.values[index] && Boolean(logic.availableCandidates(runtime.game.values, index, runtime.game.exclusions) & (1 << runtime.game.filter))
      const related = !searchMode && selected !== null && logic.PEERS[selected].includes(index)
      const same = !searchMode && activeDigit && runtime.game.values[index] === activeDigit
      view.drawCell({ index, x, y, size: runtime.cellSize, value: runtime.game.values[index], given: runtime.game.givens[index], notes: runtime.game.notes[index], selected, activeDigit, searchMode, possible, related, same, error: errors.has(index) })
    }
    view.drawGridBorders({ boardX: runtime.boardX, boardY: runtime.boardY, size: runtime.cellSize, boardWidth: layout.width })
    view.drawKeypad({ boardX: runtime.boardX, boardY: runtime.boardY, size: runtime.cellSize, boardWidth: layout.width, noteMode: runtime.game.noteMode })
    view.drawHint({ filter: runtime.game.filter })
    if (runtime.game.won) {
      view.drawResultPanel({ width, height })
      drawDifficultySelector({ width, height, difficulties, index: runtime.difficultyIndex, from: runtime.difficultyFrom, to: runtime.difficultyTo, progress: runtime.difficultyProgress, drawChevron })
    }
    view.drawCelebration({ event: runtime.celebration, startedAt: runtime.celebrationAt, width, height, boardX: runtime.boardX, boardY: runtime.boardY, cellSize: runtime.cellSize })
  }
}

function createSudokuCelebrationPlayer({ runtime, logic, draw }) {
  return function play(event) {
    if (!event) return
    runtime.celebration = event
    runtime.celebrationAt = Date.now()
    draw()
    const duration = event.win ? 2600 : event.digits.length ? 1700 : 1200
    setTimeout(() => {
      runtime.game = logic.reducer(runtime.game, { type: 'clear-event', id: event.id })
      if (runtime.game.event) play(runtime.game.event)
      else { runtime.celebration = null; runtime.celebrationAt = 0; draw() }
    }, duration)
    const frame = () => {
      if (runtime.celebration !== event) return
      draw()
      if (Date.now() - runtime.celebrationAt < duration) setTimeout(frame, 33)
    }
    setTimeout(frame, 33)
  }
}

module.exports = { createSudokuGame, createSudokuRuntime, createSudokuController, createSudokuBoardRenderer, createSudokuCelebrationPlayer }
