const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')
const gameRegistry = require('./src/app/game-registry')
const minesweeperLogic = require('./src/games/minesweeper/logic')
const { createMinesweeperView } = require('./src/games/minesweeper/view')
const { createMinesweeperGame } = require('./src/games/minesweeper/game')
const sudokuLogic = require('./src/games/sudoku/logic')
const { createSudokuView } = require('./src/games/sudoku/view')
const { createSudokuGame, createSudokuRuntime } = require('./src/games/sudoku/game')
const { touchPosition } = require('./src/shared/input')
const minesweeperController = require('./src/games/minesweeper/controller')
const sudokuController = require('./src/games/sudoku/controller')
const canvasTools = require('./src/shared/canvas').createCanvasTools(ctx)
const { roundRect, text } = canvasTools
const minesweeperView = createMinesweeperView({ ctx, roundRect, text })
const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
const scale = info.pixelRatio || 1
const W = info.windowWidth
const H = info.windowHeight
canvas.width = W * scale
canvas.height = H * scale
ctx.scale(scale, scale)

let screen = 'home'
let gameMode = false
let board = []
const boardColumns = minesweeperLogic.BOARD_COLUMNS
let boardRows = 9
let mineCount = 10
let boardX = 20
let boardY = 150
let cellSize = 36
let flagAnimation = null
let gameResult = ''
let gameStatus = 'idle'
let gameStartedAt = 0
let gameElapsedSeconds = 0
let difficultyIndex = 0
let pressedArrow = ''
let difficultyAnimating = false
let difficultyFrom = 0
let difficultyTo = 0
let difficultyProgress = 1
let arrowEffect = { side: '', phase: 'idle', progress: 1, rotation: 0 }
let startPressed = false
let startPressAt = 0
let startLongPress = false
let collapseEffects = []
let numberFeedback = null
let revealEffects = []
let revealAnimationRunning = false
let failureSequence = null
let explodedMine = null
let failureAudioContext = null
let winCelebration = null
let winCelebrationRunning = false
const sudokuRuntime = createSudokuRuntime(sudokuLogic)
let sudokuBoardX = 20
let sudokuBoardY = 150
let sudokuCellSize = 36
let gameSessions = null
const sudokuView = createSudokuView({ ctx, getWidth: () => W, getHeight: () => H, roundRect, text, logic: sudokuLogic })
// 难度从低到高，左右箭头分别对应上一级和下一级
const difficulties = minesweeperLogic.DIFFICULTIES
const iconImages = {}
;['settings', 'shopping-cart', 'list', 'info-circle'].forEach((name) => {
  const image = wx.createImage()
  image.src = `assets/icons/${name}.png`
  image.onload = () => { iconImages[name] = image; if (screen === 'minesweeper') draw() }
})
const mineStatusIcon = wx.createImage()
mineStatusIcon.src = 'assets/icons/mine.png'
mineStatusIcon.onload = () => { if (screen === 'minesweeper') draw() }

function drawHome() {
  ctx.fillStyle = '#f7f9fb'
  ctx.fillRect(0, 0, W, H)
  text('LEISURE · PUZZLE', 44, 90, 10, '#8d9aa7')
  text('休闲益智小游戏', 44, 136, 27, '#27313b')
  text('安静地玩一会儿', 44, 170, 14, '#9aa6b2')
  text('选择游戏', 44, 246, 15, '#4f5d69')
  text(`${gameRegistry.listGames().length} 个游戏`, W - 44, 246, 12, '#a4afb9', 'right')
  gameRegistry.listGames().forEach((game, index) => {
    card(44, 276 + index * 98, W - 88, game.id, game.name, game.description, game.iconBackground, game.iconColor, game.symbol)
  })
  text('简洁的界面，专注于思考', W / 2, H - 48, 11, '#b0bac2', 'center')
}

function card(x, y, w, id, name, desc, iconBg, iconColor, icon) {
  roundRect(x, y, w, 76, 14, '#ffffff', '#e9eef2')
  roundRect(x + 18, y + 14, 48, 48, 11, iconBg)
  if (id === 'minesweeper') {
    text(icon, x + 42, y + 38, 28, iconColor, 'center')
  } else {
    drawSudokuIcon(x + 28, y + 24, iconColor)
  }
  text(name, x + 84, y + 31, 16, '#33414d')
  text(desc, x + 84, y + 52, 12, '#9aa6b2')
  text('›', x + w - 22, y + 38, 25, '#b2bdc6', 'center')
}

function drawSudokuIcon(x, y, color) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  for (let i = 0; i <= 3; i += 1) {
    const offset = i * 10
    ctx.beginPath()
    ctx.moveTo(x + offset, y)
    ctx.lineTo(x + offset, y + 30)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y + offset)
    ctx.lineTo(x + 30, y + offset)
    ctx.stroke()
  }
  ctx.lineWidth = 2.5
  for (const offset of [0, 30]) {
    ctx.beginPath()
    ctx.moveTo(x + offset, y)
    ctx.lineTo(x + offset, y + 30)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y + offset)
    ctx.lineTo(x + 30, y + offset)
    ctx.stroke()
  }
}

function drawMinesweeper() {
  if (gameMode) { ctx.fillStyle = '#f7f9fb'; ctx.fillRect(0, 0, W, H); drawGameBoard(); return }
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  minesweeperView.drawBackArrow(26, 72)
  minesweeperView.drawMineLogo(W / 2, H * 0.35)
  drawDifficultySelector()
  roundRect(44, H * 0.63, W - 88, 52, 26, startPressed ? '#8293cf' : null, startPressed ? '#8293cf' : '#d7d9dc')
  text('开始游戏', W / 2, H * 0.63 + 26, 16, startPressed ? '#ffffff' : '#707174', 'center')
  drawBottomActions()
}

function drawDifficultySelector() {
  minesweeperView.drawDifficultySelector({ width: W, height: H, difficulties, index: difficultyIndex, from: difficultyFrom, to: difficultyTo, progress: difficultyProgress, drawChevron: (x, y, direction) => drawChevron(x, y, direction, pressedArrow === direction) })
}

function animateDifficulty(nextIndex) {
  difficultyFrom = difficultyIndex
  difficultyTo = nextIndex
  difficultyIndex = nextIndex
  difficultyProgress = 0
  const start = Date.now()
  function frame() {
    difficultyProgress = Math.min(1, (Date.now() - start) / 560)
    draw()
    if (difficultyProgress < 1) setTimeout(frame, 16)
  }
  setTimeout(frame, 16)
}

function drawChevron(x, y, direction, active) {
  const effect = arrowEffect.side === direction ? arrowEffect : null
  if (effect && effect.phase === 'shake') {
    x += Math.sin(effect.progress * Math.PI * 8) * (1 - effect.progress) * 8
  }
  if (effect && effect.phase === 'press') {
    ctx.fillStyle = '#8293cf'; ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill()
  } else if (effect && effect.phase === 'release') {
    const fade = 1 - effect.progress
    ctx.globalAlpha = fade
    ctx.fillStyle = '#8293cf'; ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1
  }
  if (effect && effect.phase === 'glow') {
    const fade = 1 - effect.progress
    ctx.globalAlpha = fade
    const colors = ['#8293cf', '#b4c0e2', '#aeb4c1', '#f0f1f3']
    const segment = Math.PI * 2 / colors.length
    colors.forEach((color, index) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.arc(x, y, 24, effect.rotation + index * segment, effect.rotation + (index + 1) * segment)
      ctx.stroke()
    })
    ctx.globalAlpha = 1
  }
  ctx.strokeStyle = effect && effect.phase === 'press' ? '#ffffff' : '#8a8b8f'; ctx.lineWidth = 3; ctx.lineCap = 'round'
  const sign = direction === 'left' ? -1 : 1
  ctx.beginPath(); ctx.moveTo(x - sign * 5, y - 10); ctx.lineTo(x + sign * 5, y); ctx.lineTo(x - sign * 5, y + 10); ctx.stroke()
}

function drawBottomActions() {
  const y = H * 0.82
  const xs = [W * 0.2, W * 0.4, W * 0.6, W * 0.8]
  const names = ['settings', 'shopping-cart', 'list', 'info-circle']
  names.forEach((name, i) => {
    if (iconImages[name]) ctx.drawImage(iconImages[name], xs[i] - 14, y - 14, 28, 28)
  })
}

function drawSudoku() {
  sudokuView.drawPageHeader({ elapsed: sudokuRuntime.elapsedSeconds })
  const layout = sudokuView.layout()
  const width = layout.width
  sudokuCellSize = layout.cellSize
  sudokuBoardX = layout.boardX
  sudokuBoardY = layout.boardY
  const filterY = sudokuBoardY - 35
  const filterCaptionY = filterY - 38
  sudokuView.drawFilterCaption({ y: filterCaptionY })
  sudokuView.drawFilterCards({ boardX: sudokuBoardX, filterY, size: sudokuCellSize, filter: sudokuRuntime.game.filter, values: sudokuRuntime.game.values })
  const selected = sudokuRuntime.game.selected
  const activeDigit = sudokuRuntime.game.filter === null && selected !== null ? sudokuRuntime.game.values[selected] : 0
  const errors = sudokuLogic.conflicts(sudokuRuntime.game.values)
  const searchMode = sudokuRuntime.game.filter !== null
  for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) {
    const index = row * 9 + col; const x = sudokuBoardX + col * sudokuCellSize; const y = sudokuBoardY + row * sudokuCellSize
    const possible = sudokuRuntime.game.filter !== null && !sudokuRuntime.game.values[index] && Boolean(sudokuLogic.availableCandidates(sudokuRuntime.game.values, index, sudokuRuntime.game.exclusions) & (1 << sudokuRuntime.game.filter))
    const related = !searchMode && selected !== null && sudokuLogic.PEERS[selected].includes(index)
    const same = !searchMode && activeDigit && sudokuRuntime.game.values[index] === activeDigit
    const value = sudokuRuntime.game.values[index]
    sudokuView.drawCell({ index, x, y, size: sudokuCellSize, value, given: sudokuRuntime.game.givens[index], notes: sudokuRuntime.game.notes[index], selected, activeDigit, searchMode, possible, related, same, error: errors.has(index) })
  }
  sudokuView.drawGridBorders({ boardX: sudokuBoardX, boardY: sudokuBoardY, size: sudokuCellSize, boardWidth: width })
  sudokuView.drawKeypad({ boardX: sudokuBoardX, boardY: sudokuBoardY, size: sudokuCellSize, boardWidth: width, noteMode: sudokuRuntime.game.noteMode })
  sudokuView.drawHint({ filter: sudokuRuntime.game.filter })
}

function startSudokuTimer() {
  sudokuRuntime.startTimer(() => screen === 'sudoku', draw)
}

function stopSudokuTimer() {
  sudokuRuntime.stopTimer()
}

function draw() { if (screen === 'home') drawHome(); else if (gameSessions && gameSessions[screen]) gameSessions[screen].draw(); else if (screen === 'minesweeper') drawMinesweeper(); else drawSudoku() }
draw()

const minesweeperInput = minesweeperController.createController({
  width: () => W, height: () => H, draw,
  isBusy: () => Boolean(failureSequence || winCelebrationRunning),
  isGameMode: () => gameMode, isHome: () => screen === 'home',
  getStatus: () => gameStatus, getBoard: () => board, getBoardX: () => boardX,
  getBoardY: () => boardY, getCellSize: () => cellSize, getBoardRows: () => boardRows,
  getBoardColumns: () => boardColumns, getMineCount: () => mineCount,
  countFlags: () => minesweeperLogic.countFlags(board), reveal: revealCell,
  flagCell: (r, c, x, y) => { flagAnimation = { r, c, fromX: x, fromY: y, at: Date.now() }; animateFlagFeedback() },
  pressResultArrow: side => { pressedArrow = side; arrowEffect = { side, phase: 'press', progress: 0, rotation: 0 } },
  pressDifficultyArrow: side => { pressedArrow = side; arrowEffect = { side, phase: 'press', progress: 0, rotation: 0 } },
  pressStart: () => { startPressed = true; startPressAt = Date.now(); startLongPress = false; draw(); setTimeout(() => { if (startPressed && Date.now() - startPressAt >= 450) startLongPress = true }, 450) },
  isStartPressed: () => startPressed,
  releaseStart: now => { const shouldStart = now - startPressAt < 450 && !startLongPress; startPressed = false; draw(); if (shouldStart) { gameMode = true; initBoard(); draw() } },
  leaveGame: () => { gameMode = false; gameStatus = 'idle'; gameStartedAt = 0; gameElapsedSeconds = 0; flagAnimation = null; collapseEffects = []; draw() },
  openGame: () => { screen = 'minesweeper'; draw() }, leaveMenu: () => { screen = 'home'; draw() },
  restartResult: x => { if (gameStatus === 'lost' && x >= W / 2) replayBoard(); else { initBoard(); draw() } },
  releaseResultArrow: direction => { const releasedSide = pressedArrow; pressedArrow = ''; const nextIndex = Math.max(0, Math.min(difficulties.length - 1, difficultyIndex + direction)); if (nextIndex !== difficultyIndex) { animateArrowRelease(releasedSide); animateDifficulty(nextIndex) } else animateBoundaryShake(releasedSide) },
  releaseDifficultyArrow: direction => { const releasedSide = pressedArrow; pressedArrow = ''; const nextIndex = Math.max(0, Math.min(difficulties.length - 1, difficultyIndex + direction)); if (nextIndex !== difficultyIndex) { animateArrowRelease(releasedSide); animateDifficulty(nextIndex) } else animateBoundaryShake(releasedSide) },
  clearPressedArrow: () => { pressedArrow = '' }
})

const sudokuInput = sudokuController.createController({
  width: () => W, height: () => H, getBoardX: () => sudokuBoardX, getBoardY: () => sudokuBoardY,
  getCellSize: () => sudokuCellSize, getFilter: () => sudokuRuntime.game.filter,
  leave: () => { sudokuInput.destroy(); stopSudokuTimer(); screen = 'home'; draw() },
  toggleNoteMode: () => { sudokuRuntime.game = sudokuLogic.reducer(sudokuRuntime.game, { type: 'note-mode' }); draw() },
  filter: digit => { sudokuRuntime.game = sudokuLogic.reducer(sudokuRuntime.game, { type: 'filter', digit }); draw() },
  select: index => { sudokuRuntime.game = sudokuLogic.reducer(sudokuRuntime.game, { type: 'select', index }); draw() },
  input: digit => { sudokuRuntime.game = sudokuLogic.reducer(sudokuRuntime.game, { type: sudokuRuntime.game.noteMode ? 'note' : 'input', digit }); draw() },
  exclude: (index, digit) => { sudokuRuntime.game = sudokuLogic.reducer(sudokuRuntime.game, { type: 'exclude', index, digit }); draw() }
})

gameRegistry.setGameFactory('minesweeper', () => createMinesweeperGame({ draw: drawMinesweeper, controller: minesweeperInput }))
gameRegistry.setGameFactory('sudoku', () => createSudokuGame({ draw: drawSudoku, controller: sudokuInput }))
gameSessions = Object.fromEntries(gameRegistry.listGames().filter(game => game.create).map(game => [game.id, game.create()]))

wx.onTouchStart(event => {
  if (screen === 'sudoku' || screen === 'minesweeper') { gameSessions[screen].onTouchStart(event); return }
})

wx.onTouchEnd(event => {
  if (screen === 'sudoku' || screen === 'minesweeper') { gameSessions[screen].onTouchEnd(event); return }
  const touch = event.changedTouches[0]
  const { x, y } = touchPosition(touch)
  if (screen === 'home') {
    const index = Math.floor((y - 276) / 98)
    const game = y >= 276 && index >= 0 && index < gameRegistry.listGames().length ? gameRegistry.listGames()[index] : null
    if (game && y <= 352 + index * 98) {
      screen = game.id
      if (game.id === 'sudoku') { sudokuRuntime.game = sudokuLogic.gameFromPuzzle(); startSudokuTimer() }
      draw()
      return
    }
  }
  if (screen === 'minesweeper' && y < 120 && x < 90) { screen = 'home'; draw(); return }
  if (screen === 'minesweeper' && Math.abs(y - H * 0.56) < 40) {
    const direction = x < W / 2 ? -1 : 1
    const nextIndex = Math.max(0, Math.min(difficulties.length - 1, difficultyIndex + direction))
    const releasedSide = pressedArrow
    pressedArrow = ''
    if (nextIndex !== difficultyIndex) {
      animateArrowRelease(releasedSide)
      animateDifficulty(nextIndex)
    } else {
      animateBoundaryShake(releasedSide)
    }
    return
  }
  pressedArrow = ''
  if (screen === 'minesweeper') draw()
})

function revealCell(r, c) {
  if (gameStatus !== 'playing') return
  const animation = arguments[2] || null
  const cell = board[r][c]
  if (cell.open) {
    // 只有数字格支持按周围旗子数量展开；已打开的空白格不响应。
    if (cell.number === 0) return
    const around = neighbors(r, c); const flags = around.filter(([nr, nc]) => board[nr][nc].flag).length
    if (flags === cell.number) {
      const animation = { nextDelay: 0 }
      around.forEach(([nr, nc]) => { if (!board[nr][nc].open && !board[nr][nc].flag) revealCell(nr, nc, animation) })
    } else {
      triggerCollapseEffect(r, c, around.filter(([nr, nc]) => !board[nr][nc].open && !board[nr][nc].flag))
    }
    return
  }
  if (cell.mine) {
    triggerFailureSequence(r, c)
    return
  }
  if (!gameStartedAt) {
    gameStartedAt = Date.now()
    updateGameTimer()
  }
  cell.open = true
  if (animation) scheduleRevealEffect(r, c, animation)
  if (cell.number === 0) {
    const nextAnimation = animation || { nextDelay: 0 }
    if (!animation) scheduleRevealEffect(r, c, nextAnimation)
    neighbors(r, c).forEach(([nr, nc]) => { if (!board[nr][nc].open) revealCell(nr, nc, nextAnimation) })
  }
  const safeRemaining = minesweeperLogic.countSafeRemaining(board)
  if (safeRemaining === 0) {
    gameStatus = 'won'
    board.forEach(row => row.forEach(item => { if (item.mine) item.flag = true }))
    startWinCelebration()
  }
}

function scheduleRevealEffect(r, c, animation) {
  revealEffects.push({ r, c, at: Date.now(), delay: animation.nextDelay, duration: 360 })
  animation.nextDelay += 42
  if (!revealAnimationRunning) {
    revealAnimationRunning = true
    animateRevealEffects()
  }
}

function animateRevealEffects() {
  if (!revealEffects.length) {
    revealAnimationRunning = false
    draw()
    return
  }
  const now = Date.now()
  revealEffects = revealEffects.filter(effect => now - effect.at < effect.delay + effect.duration)
  draw()
  if (revealEffects.length) setTimeout(animateRevealEffects, 16)
  else revealAnimationRunning = false
}

function triggerCollapseEffect(r, c, unopenedNeighbors) {
  const now = Date.now()
  numberFeedback = { r, c, at: now }
  unopenedNeighbors.forEach(([nr, nc]) => {
    collapseEffects.push({ r: nr, c: nc, at: now })
  })
  function frame() {
    collapseEffects = collapseEffects.filter(effect => Date.now() - effect.at < 360)
    if (numberFeedback && Date.now() - numberFeedback.at >= 520) numberFeedback = null
    draw()
    if (collapseEffects.length || numberFeedback) setTimeout(frame, 16)
  }
  frame()
}

function animateFlagFeedback() {
  const start = Date.now()
  function frame() {
    if (!flagAnimation) return
    draw()
    if (Date.now() - start < 520) setTimeout(frame, 16)
    else { flagAnimation = null; draw() }
  }
  frame()
}

function playFailureClick() {
  try {
    if (!failureAudioContext && typeof wx.createWebAudioContext === 'function') {
      failureAudioContext = wx.createWebAudioContext()
    }
    if (failureAudioContext && failureAudioContext.createOscillator && failureAudioContext.createGain) {
      if (failureAudioContext.resume) failureAudioContext.resume()
      const oscillator = failureAudioContext.createOscillator()
      const gain = failureAudioContext.createGain()
      const now = failureAudioContext.currentTime || 0
      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(210, now)
      oscillator.frequency.exponentialRampToValueAtTime(78, now + 0.09)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
      oscillator.connect(gain)
      gain.connect(failureAudioContext.destination)
      oscillator.start(now)
      oscillator.stop(now + 0.13)
    }
  } catch (error) {
    // 音频能力在部分开发者工具或旧基础库中不可用，继续使用视觉反馈。
  }
  if (typeof wx.vibrateShort === 'function') {
    try { wx.vibrateShort({ type: 'light' }) } catch (error) { /* ignore */ }
  }
}

function triggerFailureSequence(r, c) {
  revealEffects = []
  revealAnimationRunning = false
  const revealQueue = []
  board.forEach((row, rowIndex) => row.forEach((cell, colIndex) => {
    if (cell.mine && !(rowIndex === r && colIndex === c) && !cell.flag) revealQueue.push([rowIndex, colIndex])
  }))
  board[r][c].open = true
  explodedMine = { r, c }
  gameStatus = 'failing'
  failureSequence = { r, c, phase: 'freeze', at: Date.now(), revealQueue, revealed: 0 }
  playFailureClick()
  draw()
  setTimeout(advanceFailureSequence, 360)
}

function advanceFailureSequence() {
  if (!failureSequence) return
  if (failureSequence.phase === 'freeze') {
    failureSequence.phase = 'explode'
    failureSequence.at = Date.now()
    animateFailureFrame()
    return
  }
  if (failureSequence.phase === 'explode') {
    failureSequence.phase = 'reveal'
    failureSequence.at = Date.now()
    failureSequence.revealed = 0
    animateFailureFrame()
    return
  }
  const next = failureSequence.revealQueue[failureSequence.revealed]
  if (next) {
    board[next[0]][next[1]].open = true
    failureSequence.revealed += 1
    draw()
    setTimeout(advanceFailureSequence, 72)
    return
  }
  failureSequence = null
  gameStatus = 'lost'
  draw()
}

function animateFailureFrame() {
  if (!failureSequence) return
  draw()
  const duration = failureSequence.phase === 'explode' ? 520 : 0
  if (duration && Date.now() - failureSequence.at < duration) setTimeout(animateFailureFrame, 16)
  else advanceFailureSequence()
}

function initBoard() {
  const difficulty = difficulties[difficultyIndex]
  boardRows = difficulty.rows
  mineCount = difficulty.mines
  failureSequence = null
  explodedMine = null
  winCelebration = null
  winCelebrationRunning = false
  revealEffects = []
  revealAnimationRunning = false
  gameStatus = 'playing'
  gameStartedAt = 0
  gameElapsedSeconds = 0
  collapseEffects = []
  flagAnimation = null
  numberFeedback = null
  board = minesweeperLogic.createBoard(difficultyIndex)
}

function replayBoard() {
  failureSequence = null
  explodedMine = null
  winCelebration = null
  winCelebrationRunning = false
  revealEffects = []
  revealAnimationRunning = false
  gameStatus = 'playing'
  gameStartedAt = 0
  gameElapsedSeconds = 0
  collapseEffects = []
  numberFeedback = null
  flagAnimation = null
  board.forEach(row => row.forEach(cell => { cell.open = false; cell.flag = false }))
  draw()
}

function neighbors(r, c) { return minesweeperLogic.neighbors(r, c, boardRows, boardColumns) }
function updateGameTimer() {
  if (!gameStartedAt || gameStatus !== 'playing') return
  gameElapsedSeconds = Math.floor((Date.now() - gameStartedAt) / 1000)
  draw()
  setTimeout(updateGameTimer, 1000)
}
function drawGameBoard() {
  const maxWidth = Math.min(W - 36, 360)
  const reservedTop = 112
  const reservedBottom = 148
  const availableHeight = Math.max(180, H - reservedTop - reservedBottom)
  const widthCellSize = maxWidth / boardColumns
  const heightCellSize = availableHeight / boardRows
  cellSize = Math.min(widthCellSize, heightCellSize)
  const width = cellSize * boardColumns
  const gap = Math.max(4, width * 0.012)
  boardX = (W - width) / 2
  const boardHeight = cellSize * boardRows
  boardY = Math.max(96, reservedTop + (H - reservedTop - reservedBottom - boardHeight) / 2)
  const flagCount = minesweeperLogic.countFlags(board)
  const statusY = 82
  minesweeperView.drawBackArrow(26, 72)
  if (mineStatusIcon.width) ctx.drawImage(mineStatusIcon, W / 2 - 25, statusY - 11, 22, 22)
  text(String(mineCount - flagCount), W / 2 + 1, statusY, 18, '#667483', 'left')
  text(`${gameElapsedSeconds}s`, W / 2, statusY + 24, 18, '#667483', 'center')
  for (let r = 0; r < boardRows; r += 1) for (let c = 0; c < boardColumns; c += 1) {
    const cell = board[r][c]; const x = boardX + c * cellSize; const y = boardY + r * cellSize
    minesweeperView.drawCell({ cell, x, y, cellSize, gap, row: r, col: c, effect: collapseEffects.find(item => item.r === r && item.c === c), flagFx: flagAnimation && flagAnimation.r === r && flagAnimation.c === c ? flagAnimation : null, exploded: explodedMine && explodedMine.r === r && explodedMine.c === c, failure: failureSequence, revealEffect: revealEffects.find(item => item.r === r && item.c === c), drawFlyingFlag: minesweeperView.drawFlyingFlag, drawMineExplosion: (cx, cy) => minesweeperView.drawMineExplosion({ x: cx, y: cy, cellSize, progress: failureSequence ? Math.min(1, Math.max(0, (Date.now() - failureSequence.at) / 520)) : 1 }), drawRevealOverlay: minesweeperView.drawRevealOverlay })
  }
  if (gameStatus === 'won') {
    if (winCelebrationRunning) drawBoardWinCelebration()
    else drawGameResult()
  } else if (gameStatus === 'lost') drawGameResult()
}

function drawBoardWinCelebration() {
  if (!winCelebration) return
  const progress = Math.min(1, (Date.now() - winCelebration.at) / 2800)
  const centerX = boardX + boardColumns * cellSize / 2
  const centerY = boardY + boardRows * cellSize / 2
  const boardWidth = boardColumns * cellSize
  const boardHeight = boardRows * cellSize
  const pulse = 0.5 + Math.sin(progress * Math.PI * 6) * 0.5
  ctx.save()
  ctx.fillStyle = 'rgba(247, 249, 251, 0.42)'
  ctx.fillRect(boardX, boardY, boardWidth, boardHeight)
  for (let i = 0; i < 3; i += 1) {
    const cycle = (progress * 3 - i * 0.28 + 1) % 1
    const radius = 18 + cycle * Math.min(boardWidth, boardHeight) * 0.62
    ctx.globalAlpha = (1 - cycle) * 0.42
    ctx.strokeStyle = i === 1 ? '#8293cf' : '#78a994'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.stroke()
  }
  ctx.globalAlpha = 0.22 + pulse * 0.08
  ctx.fillStyle = '#9bc6ac'
  ctx.beginPath(); ctx.arc(centerX, centerY, 34 + pulse * 8, 0, Math.PI * 2); ctx.fill()
  const particles = ['#78a994', '#8293cf', '#edb36d', '#b5c9d9', '#9ebcae', '#d89a72', '#a8bad8', '#8ab39e']
  particles.forEach((color, i) => {
    const angle = i * Math.PI * 2 / particles.length + 0.18
    const distance = 24 + progress * Math.min(boardWidth, boardHeight) * 0.58
    const x = centerX + Math.cos(angle) * distance
    const y = centerY + Math.sin(angle) * distance
    ctx.globalAlpha = (1 - progress) * 0.9
    ctx.fillStyle = color
    ctx.save(); ctx.translate(x, y); ctx.rotate(progress * 4 + i)
    ctx.beginPath(); ctx.arc(0, 0, 2 + i % 3, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  })
  ctx.globalAlpha = 0.92 + pulse * 0.06
  ctx.fillStyle = '#78a994'
  ctx.beginPath(); ctx.arc(centerX, centerY, 18 + pulse * 2, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(centerX - 8, centerY); ctx.lineTo(centerX - 2, centerY + 6); ctx.lineTo(centerX + 9, centerY - 7); ctx.stroke()
  ctx.restore()
}

function drawGameResult() {
  const won = gameStatus === 'won'
  minesweeperView.drawResultPanel({ width: W, height: H, won, drawCelebration: drawWinCelebration, drawDifficultySelector: drawResultDifficultySelector })
}

function startWinCelebration() {
  if (winCelebrationRunning) return
  winCelebration = { at: Date.now() }
  winCelebrationRunning = true
  animateWinCelebration()
}

function animateWinCelebration() {
  if (!winCelebration) return
  draw()
  if (Date.now() - winCelebration.at < 2800) setTimeout(animateWinCelebration, 16)
  else { winCelebrationRunning = false; draw() }
}

function drawWinCelebration() {
  minesweeperView.drawWinCelebration({ startedAt: winCelebration && winCelebration.at, width: W, height: H })
}

function drawResultDifficultySelector() {
  minesweeperView.drawResultDifficultySelector({ width: W, height: H, difficulties, index: difficultyIndex, from: difficultyFrom, to: difficultyTo, progress: difficultyProgress, drawChevron: (x, y, direction) => drawChevron(x, y, direction, pressedArrow === direction) })
}

function animateArrowRelease(side) {
  if (!side) return
  const start = Date.now()
  arrowEffect = { side, phase: 'release', progress: 0, rotation: 0 }
  function frame() {
    const elapsed = Date.now() - start
    if (elapsed < 120) {
      arrowEffect.phase = 'release'; arrowEffect.progress = elapsed / 120
    } else {
      arrowEffect.phase = 'glow'; arrowEffect.progress = Math.min(1, (elapsed - 120) / 430); arrowEffect.rotation += 0.32
    }
    draw()
    if (arrowEffect.progress < 1) setTimeout(frame, 16)
    else arrowEffect = { side: '', phase: 'idle', progress: 1, rotation: 0 }
  }
  setTimeout(frame, 16)
}

function animateBoundaryShake(side) {
  if (!side) return
  const start = Date.now()
  arrowEffect = { side, phase: 'shake', progress: 0, rotation: 0 }
  function frame() {
    arrowEffect.progress = Math.min(1, (Date.now() - start) / 240)
    draw()
    if (arrowEffect.progress < 1) setTimeout(frame, 16)
    else arrowEffect = { side: '', phase: 'idle', progress: 1, rotation: 0 }
  }
  setTimeout(frame, 16)
}
