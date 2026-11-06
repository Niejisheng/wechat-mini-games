const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')
const gameRegistry = require('./src/app/game-registry')
const minesweeperLogic = require('./src/games/minesweeper/logic')
const sudokuLogic = require('./src/games/sudoku/logic')
const canvasTools = require('./src/shared/canvas').createCanvasTools(ctx)
const { roundRect, text } = canvasTools
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
let gamePress = null
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
let sudokuGame = sudokuLogic.gameFromPuzzle()
let sudokuBoardX = 20
let sudokuBoardY = 150
let sudokuCellSize = 36
let sudokuPress = null
let sudokuLongPressTimer = null
let sudokuElapsedSeconds = 0
let sudokuTimer = null
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
  card(44, 276, W - 88, 'minesweeper', '扫雷', '找出所有地雷，保持冷静', '#e8eff4', '#657b8c', '✣')
  card(44, 374, W - 88, 'sudoku', '数独', '用逻辑填满九宫格', '#eef0ed', '#788778', '9')
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
  drawBackArrow(26, 72)
  drawMineLogo(W / 2, H * 0.35)
  drawDifficultySelector()
  roundRect(44, H * 0.63, W - 88, 52, 26, startPressed ? '#8293cf' : null, startPressed ? '#8293cf' : '#d7d9dc')
  text('开始游戏', W / 2, H * 0.63 + 26, 16, startPressed ? '#ffffff' : '#707174', 'center')
  drawBottomActions()
}

function drawBackArrow(x, y) {
  ctx.strokeStyle = '#8a8b8f'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(x, y + 12); ctx.lineTo(x + 12, y + 24); ctx.stroke()
}

function drawMineLogo(cx, cy) {
  ctx.fillStyle = '#8293cf'
  ctx.beginPath(); ctx.arc(cx, cy, 66, 0, Math.PI * 2); ctx.fill()
  const teeth = [[0, -78], [55, -55], [78, 0], [55, 55], [0, 78], [-55, 55], [-78, 0], [-55, -55]]
  teeth.forEach(([dx, dy]) => {
    ctx.save(); ctx.translate(cx + dx, cy + dy); ctx.rotate(Math.atan2(dy, dx))
    roundRect(-10, -17, 20, 34, 5, '#8293cf'); ctx.restore()
  })
  roundRect(cx - 19, cy - 19, 38, 38, 6, '#ffffff')
}

function drawDifficultySelector() {
  const y = H * 0.56
  drawChevron(72, y, 'left', pressedArrow === 'left')
  if (difficultyProgress < 1) {
    // 两阶段动画：旧文字先完整滑出，新文字再开始滑入。
    // 滑出先慢后快，滑入先快后慢。
    const outgoingProgress = Math.min(1, difficultyProgress * 2)
    const incomingProgress = Math.max(0, (difficultyProgress - 0.5) * 2)
    const outgoing = Math.pow(outgoingProgress, 3)
    const incoming = 1 - Math.pow(1 - incomingProgress, 3)
    const direction = difficultyTo > difficultyFrom ? 1 : -1
    const travel = Math.min(132, W * 0.36)
    ctx.save(); ctx.globalAlpha = 1 - outgoing
    text(difficulties[difficultyFrom].name, W / 2 - direction * outgoing * travel, y, 16, '#707174', 'center')
    ctx.globalAlpha = incoming
    text(difficulties[difficultyTo].name, W / 2 + direction * (1 - incoming) * travel, y, 16, '#707174', 'center')
    ctx.restore()
  } else text(difficulties[difficultyIndex].name, W / 2, y, 16, '#707174', 'center')
  drawChevron(W - 72, y, 'right', pressedArrow === 'right')
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

function drawGear(x, y) {
  ctx.fillStyle = '#707174'; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill()
  for (let i = 0; i < 8; i += 1) { ctx.save(); ctx.translate(x, y); ctx.rotate(i * Math.PI / 4); roundRect(-3, -19, 6, 9, 2, '#707174'); ctx.restore() }
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill()
}
function drawCart(x, y) { ctx.strokeStyle = '#707174'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 12, y - 10); ctx.lineTo(x - 7, y - 10); ctx.lineTo(x - 2, y + 5); ctx.lineTo(x + 12, y + 5); ctx.lineTo(x + 16, y - 6); ctx.lineTo(x - 5, y - 6); ctx.stroke(); ctx.fillStyle = '#707174'; ctx.beginPath(); ctx.arc(x, y + 14, 3, 0, Math.PI * 2); ctx.arc(x + 12, y + 14, 3, 0, Math.PI * 2); ctx.fill() }
function drawScore(x, y) { ctx.strokeStyle = '#707174'; ctx.lineWidth = 3; [0, 8, 16].forEach((dy) => { ctx.beginPath(); ctx.arc(x - 12, y - 9 + dy, 2, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 4, y - 9 + dy); ctx.lineTo(x + 15, y - 9 + dy); ctx.stroke() }) }
function drawInfo(x, y) { ctx.fillStyle = '#707174'; ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill(); text('i', x, y + 1, 19, '#ffffff', 'center') }

function drawSudoku() {
  ctx.fillStyle = '#f7f9fb'; ctx.fillRect(0, 0, W, H)
  text('A LITTLE FOCUS, A LITTLE JOY', 24, 24, 9, '#8293a8')
  text('片刻专注，步步有解', 24, 57, 25, '#27313b')
  text('.', 24 + ctx.measureText('片刻专注，步步有解').width + 2, 57, 25, '#8293cf')
  ctx.fillStyle = '#78a994'; ctx.beginPath(); ctx.arc(28, 103, 3.5, 0, Math.PI * 2); ctx.fill()
  text('中等', 40, 103, 13, '#33414d')
  text('/', 78, 103, 12, '#a4afb9')
  text('多想一步', 98, 103, 12, '#8293a8')
  drawClock(W - 62, 103)
  text(formatSudokuTime(sudokuElapsedSeconds), W - 22, 103, 13, '#8293a8', 'right')
  const width = Math.min(W - 24, 360)
  sudokuCellSize = width / 9
  sudokuBoardX = (W - width) / 2
  const boardHeight = sudokuCellSize * 9
  const centeredBoardY = (H - boardHeight) / 2 + 8
  const minimumBoardY = 190
  const maximumBoardY = Math.max(minimumBoardY, H - boardHeight - 96)
  sudokuBoardY = Math.max(minimumBoardY, Math.min(maximumBoardY, centeredBoardY))
  const filterY = sudokuBoardY - 35
  const filterCaptionY = filterY - 38
  text('寻找数字', 24, filterCaptionY, 13, '#536b7d')
  text('点击查看可能位置', 91, filterCaptionY, 10, '#a0adb7')
  text('角标为剩余数量', W - 24, filterCaptionY, 10, '#8798a5', 'right')
  sudokuLogic.DIGITS.forEach((digit, index) => {
    const x = sudokuBoardX + (index + 0.5) * sudokuCellSize
    const active = sudokuGame.filter === digit
    const remaining = Math.max(0, 9 - sudokuGame.values.filter(value => value === digit).length)
    const completed = remaining === 0
    const cardFill = completed ? '#eef2f4' : active ? '#e5edf9' : '#ffffff'
    const cardStroke = completed ? '#e2e7eb' : active ? '#8293cf' : '#d8e1e8'
    const digitColor = completed ? '#a9b4bc' : active ? '#5e78ad' : '#536b7d'
    roundRect(x - sudokuCellSize * 0.43, filterY - 19, sudokuCellSize * 0.86, 42, 9, completed ? '#e1e7eb' : '#d6e0e8')
    roundRect(x - sudokuCellSize * 0.43, filterY - 21, sudokuCellSize * 0.86, 42, 9, cardFill, cardStroke)
    drawSearchDigit(String(digit), x, filterY + 2, digitColor)
    ctx.fillStyle = completed ? '#87ad9b' : '#ed9a58'; ctx.beginPath(); ctx.arc(x + sudokuCellSize * 0.31, filterY - 15, 7.5, 0, Math.PI * 2); ctx.fill()
    if (completed) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + sudokuCellSize * 0.25, filterY - 15); ctx.lineTo(x + sudokuCellSize * 0.29, filterY - 12); ctx.lineTo(x + sudokuCellSize * 0.36, filterY - 18); ctx.stroke()
    } else text(String(remaining), x + sudokuCellSize * 0.31, filterY - 15, 8, '#ffffff', 'center')
  })
  const selected = sudokuGame.selected
  const activeDigit = sudokuGame.filter === null && selected !== null ? sudokuGame.values[selected] : 0
  const errors = sudokuLogic.conflicts(sudokuGame.values)
  const searchMode = sudokuGame.filter !== null
  for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) {
    const index = row * 9 + col; const x = sudokuBoardX + col * sudokuCellSize; const y = sudokuBoardY + row * sudokuCellSize
    const possible = sudokuGame.filter !== null && !sudokuGame.values[index] && Boolean(sudokuLogic.availableCandidates(sudokuGame.values, index, sudokuGame.exclusions) & (1 << sudokuGame.filter))
    const related = !searchMode && selected !== null && sudokuLogic.PEERS[selected].includes(index)
    const same = !searchMode && activeDigit && sudokuGame.values[index] === activeDigit
    ctx.fillStyle = !searchMode && index === selected ? '#dce5f8' : possible ? '#f5e5d7' : same ? '#edf1f5' : '#ffffff'
    ctx.fillRect(x, y, sudokuCellSize, sudokuCellSize)
    ctx.strokeStyle = errors.has(index) ? '#d86b4f' : '#d8e0e6'; ctx.lineWidth = 1; ctx.strokeRect(x, y, sudokuCellSize, sudokuCellSize)
    if (related && index !== selected) { ctx.fillStyle = '#f3f6f8'; ctx.fillRect(x + 1, y + 1, sudokuCellSize - 2, sudokuCellSize - 2) }
    const value = sudokuGame.values[index]
    if (value) text(String(value), x + sudokuCellSize / 2, y + sudokuCellSize / 2, 21, sudokuGame.givens[index] ? '#33414d' : '#8293cf', 'center')
    else sudokuLogic.DIGITS.forEach(digit => { if (sudokuGame.notes[index] & (1 << digit)) text(String(digit), x + ((digit - 1) % 3 + 0.5) * sudokuCellSize / 3, y + (Math.floor((digit - 1) / 3) + 0.5) * sudokuCellSize / 3, 8, '#8b9aa6', 'center') })
    if (searchMode && selected === index) {
      ctx.strokeStyle = '#8293cf'; ctx.lineWidth = 2
      ctx.strokeRect(x + 2, y + 2, sudokuCellSize - 4, sudokuCellSize - 4)
    }
  }
  ctx.strokeStyle = '#95a4ae'; ctx.lineWidth = 2
  for (let i = 0; i <= 9; i += 3) { ctx.beginPath(); ctx.moveTo(sudokuBoardX + i * sudokuCellSize, sudokuBoardY); ctx.lineTo(sudokuBoardX + i * sudokuCellSize, sudokuBoardY + width); ctx.stroke(); ctx.beginPath(); ctx.moveTo(sudokuBoardX, sudokuBoardY + i * sudokuCellSize); ctx.lineTo(sudokuBoardX + width, sudokuBoardY + i * sudokuCellSize); ctx.stroke() }
  const keypadY = Math.min(H - 48, sudokuBoardY + width + 56)
  sudokuLogic.DIGITS.forEach((digit, index) => { const x = sudokuBoardX + (index + 0.5) * sudokuCellSize; const active = sudokuGame.noteMode; roundRect(x - sudokuCellSize * 0.32, keypadY - 18, sudokuCellSize * 0.64, 36, 12, active ? '#f0f3f7' : '#ffffff', '#d7dfe5'); text(String(digit), x, keypadY, 17, '#667483', 'center') })
  text(sudokuGame.filter ? '淡橙色为候选位置 · 长按候选格排除或恢复' : '点击上方数字寻找候选位置', W / 2, H - 16, 10, '#a4afb9', 'center')
}

function drawSearchDigit(value, x, y, color) {
  ctx.font = '19px -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", sans-serif'
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(value, x, y)
}

function drawClock(x, y) {
  ctx.strokeStyle = '#8293a8'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 4); ctx.moveTo(x, y); ctx.lineTo(x + 3, y + 2); ctx.stroke()
}

function formatSudokuTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function startSudokuTimer() {
  if (sudokuTimer) clearInterval(sudokuTimer)
  sudokuElapsedSeconds = 0
  sudokuTimer = setInterval(() => { if (screen === 'sudoku' && !sudokuGame.won) { sudokuElapsedSeconds += 1; draw() } }, 1000)
}

function stopSudokuTimer() {
  if (sudokuTimer) clearInterval(sudokuTimer)
  sudokuTimer = null
}

function draw() { if (screen === 'home') drawHome(); else if (screen === 'minesweeper') drawMinesweeper(); else drawSudoku() }
draw()

wx.onTouchStart(event => {
  if (screen === 'sudoku') {
    if (sudokuLongPressTimer) clearTimeout(sudokuLongPressTimer)
    const touch = event.touches[0]; const position = touchPosition(touch)
    sudokuPress = { ...position, at: Date.now(), longPressed: false }
    sudokuLongPressTimer = setTimeout(() => {
      if (!sudokuPress || !sudokuGame.filter) return
      const col = Math.floor((sudokuPress.x - sudokuBoardX) / sudokuCellSize); const row = Math.floor((sudokuPress.y - sudokuBoardY) / sudokuCellSize)
      if (row >= 0 && row < 9 && col >= 0 && col < 9) { const index = row * 9 + col; sudokuPress.longPressed = true; sudokuGame = sudokuLogic.reducer(sudokuGame, { type: 'exclude', index, digit: sudokuGame.filter }); draw() }
    }, 450)
    return
  }
  if (screen !== 'minesweeper') return
  if (failureSequence) return
  const touch = event.touches[0]
  const { x, y } = touchPosition(touch)
  if (gameMode) {
    if (x < 58 && y < 118) { gamePress = { x, y, at: Date.now(), back: true }; return }
    if (gameStatus !== 'playing' && Math.abs(y - H * 0.89) < 40) {
      pressedArrow = x < W / 2 ? 'left' : 'right'
      arrowEffect = { side: pressedArrow, phase: 'press', progress: 0, rotation: 0 }
      gamePress = { x, y, at: Date.now(), resultArrow: true }
      draw()
      return
    }
    const col = Math.floor((x - boardX) / cellSize), row = Math.floor((y - boardY) / cellSize)
    gamePress = { x, y, at: Date.now(), row, col, flagged: false }
    setTimeout(() => {
      const press = gamePress
      if (!press || press.at + 450 > Date.now() || press.flagged || gameStatus !== 'playing') return
      if (press.row >= 0 && press.row < boardRows && press.col >= 0 && press.col < boardColumns) {
        const cell = board[press.row][press.col]
        if (!cell.open) {
          if (!cell.flag && minesweeperLogic.countFlags(board) >= mineCount) return
          cell.flag = !cell.flag
          press.flagged = true
          flagAnimation = { r: press.row, c: press.col, fromX: press.x, fromY: press.y, at: Date.now() }
          animateFlagFeedback()
        }
      }
    }, 450)
    return
  }
  if (y >= H * 0.63 && y <= H * 0.63 + 52 && x >= 44 && x <= W - 44) {
    startPressed = true
    startPressAt = Date.now()
    startLongPress = false
    draw()
    setTimeout(() => {
      if (startPressed && Date.now() - startPressAt >= 450) startLongPress = true
    }, 450)
    return
  }
  if (Math.abs(y - H * 0.56) < 40) {
    pressedArrow = x < W / 2 ? 'left' : 'right'
    arrowEffect = { side: pressedArrow, phase: 'press', progress: 0, rotation: 0 }
    draw()
  }
})

wx.onTouchEnd(event => {
  if (screen === 'sudoku' && sudokuPress) {
    if (sudokuLongPressTimer) clearTimeout(sudokuLongPressTimer)
    const press = sudokuPress; sudokuPress = null
    const touch = event.changedTouches[0]; const { x, y } = touchPosition(touch)
    if (press.longPressed) return
    if (x < 90 && y < 100) { stopSudokuTimer(); screen = 'home'; draw(); return }
    if (x >= W - 90 && y >= 35 && y <= 85) { sudokuGame = sudokuLogic.reducer(sudokuGame, { type: 'note-mode' }); draw(); return }
    const filterY = sudokuBoardY - 35
    if (Math.abs(y - filterY) < 24 && x >= sudokuBoardX && x <= sudokuBoardX + sudokuCellSize * 9) { const digit = Math.floor((x - sudokuBoardX) / sudokuCellSize) + 1; sudokuGame = sudokuLogic.reducer(sudokuGame, { type: 'filter', digit }); draw(); return }
    if (x >= sudokuBoardX && x <= sudokuBoardX + sudokuCellSize * 9 && y >= sudokuBoardY && y <= sudokuBoardY + sudokuCellSize * 9) { const col = Math.floor((x - sudokuBoardX) / sudokuCellSize); const row = Math.floor((y - sudokuBoardY) / sudokuCellSize); sudokuGame = sudokuLogic.reducer(sudokuGame, { type: 'select', index: row * 9 + col }); draw(); return }
    const keypadY = Math.min(H - 48, sudokuBoardY + sudokuCellSize * 9 + 56)
    if (Math.abs(y - keypadY) < 26 && x >= sudokuBoardX && x <= sudokuBoardX + sudokuCellSize * 9) { const digit = Math.floor((x - sudokuBoardX) / sudokuCellSize) + 1; sudokuGame = sudokuLogic.reducer(sudokuGame, { type: sudokuGame.noteMode ? 'note' : 'input', digit }); draw() }
    return
  }
  if (failureSequence) return
  const touch = event.changedTouches[0]
  const { x, y } = touchPosition(touch)
  if (gameMode && gamePress) {
    const press = gamePress; gamePress = null
    if (press.back) {
      gameMode = false; gameStatus = 'idle'; gameStartedAt = 0; gameElapsedSeconds = 0
      flagAnimation = null; collapseEffects = []; draw(); return
    }
    if (gameStatus !== 'playing') {
      if (y >= H * 0.79 && y <= H * 0.79 + 52 && x >= 44 && x <= W - 44) {
        if (gameStatus === 'lost' && x >= W / 2) replayBoard()
        else { initBoard(); draw() }
      } else if (press.resultArrow) {
        const direction = x < W / 2 ? -1 : 1
        const nextIndex = Math.max(0, Math.min(difficulties.length - 1, difficultyIndex + direction))
        const releasedSide = pressedArrow
        pressedArrow = ''
        if (nextIndex !== difficultyIndex) {
          animateArrowRelease(releasedSide)
          animateDifficulty(nextIndex)
        } else animateBoundaryShake(releasedSide)
      }
      return
    }
    const col = Math.floor((press.x - boardX) / cellSize); const row = Math.floor((press.y - boardY) / cellSize)
    if (row >= 0 && row < boardRows && col >= 0 && col < boardColumns) {
      const cell = board[row][col]
      if (!press.flagged && Date.now() - press.at < 450 && !cell.flag) revealCell(row, col)
      draw()
    }
    return
  }
  if (screen === 'minesweeper' && startPressed) {
    const duration = Date.now() - startPressAt
    const shouldStart = duration < 450 && !startLongPress
    startPressed = false
    draw()
    if (shouldStart) { gameMode = true; initBoard(); draw() }
    return
  }
  if (screen === 'home' && y >= 276 && y <= 352) { screen = 'minesweeper'; draw(); return }
  if (screen === 'home' && y >= 374 && y <= 450) { screen = 'sudoku'; sudokuGame = sudokuLogic.gameFromPuzzle(); startSudokuTimer(); draw(); return }
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

function touchPosition(touch) {
  return {
    x: touch.clientX ?? touch.pageX ?? touch.x,
    y: touch.clientY ?? touch.pageY ?? touch.y
  }
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
  drawBackArrow(26, 72)
  if (mineStatusIcon.width) ctx.drawImage(mineStatusIcon, W / 2 - 25, statusY - 11, 22, 22)
  text(String(mineCount - flagCount), W / 2 + 1, statusY, 18, '#667483', 'left')
  text(`${gameElapsedSeconds}s`, W / 2, statusY + 24, 18, '#667483', 'center')
  for (let r = 0; r < boardRows; r += 1) for (let c = 0; c < boardColumns; c += 1) {
    const cell = board[r][c]; const x = boardX + c * cellSize; const y = boardY + r * cellSize
    const effect = collapseEffects.find(item => item.r === r && item.c === c)
    const revealEffect = revealEffects.find(item => item.r === r && item.c === c)
    let effectProgress = 0
    if (effect) effectProgress = Math.max(0, Math.min(1, (Date.now() - effect.at) / 360))
    const effectAmount = effect ? Math.sin(effectProgress * Math.PI) : 0
    const effectOffset = effectAmount * 6
    const effectScale = 1 - effectAmount * 0.2
    const centerX = x + cellSize / 2
    const centerY = y + cellSize / 2
    const inset = gap / 2; const size = cellSize - gap
    ctx.save()
    // 旗子数量不足/过多时，周围格子明显收缩并下沉，给出塌陷反馈。
    if (effect) {
      ctx.translate(centerX, centerY + effectOffset)
      ctx.scale(effectScale, effectScale)
      ctx.translate(-centerX, -centerY)
      ctx.globalAlpha = 1 - effectAmount * 0.35
    }
    const fill = cell.flag ? '#71899e' : (cell.open ? '#f7fafc' : '#e7eff6')
    if (!cell.open) {
      roundRect(x + inset, y + inset + 2, size, size, 10, '#c3d2dc')
      roundRect(x + inset, y + inset, size, size, 10, fill, cell.flag ? '#71899e' : '#c5d4df')
      ctx.globalAlpha = 0.72
      roundRect(x + inset + 2, y + inset + 2, size - 4, size - 4, 8, null, '#f8fbfd')
      ctx.globalAlpha = 1
    } else {
      roundRect(x + inset, y + inset, size, size, 10, fill, '#cfdae2')
    }
    const flagFx = flagAnimation && flagAnimation.r === r && flagAnimation.c === c ? flagAnimation : null
    if (cell.flag && !cell.open && flagFx) drawFlyingFlag(flagFx, centerX, centerY)
    else if (cell.flag && !cell.open) drawFlag(centerX, centerY)
    else if (cell.open && cell.mine) {
      if (failureSequence && failureSequence.phase === 'explode' && failureSequence.r === r && failureSequence.c === c) drawMineExplosion(centerX, centerY)
      else drawMineGlyph(centerX, centerY, cellSize * 0.58, explodedMine && explodedMine.r === r && explodedMine.c === c ? '#d86b4f' : '#5f7180')
    }
    else if (cell.open && cell.number) text(String(cell.number), x + cellSize / 2, y + cellSize / 2, 22, ['','#2864a3','#258c55','#7b5aa0','#b06a48'][cell.number] || '#64788c', 'center')
    if (revealEffect) drawRevealOverlay(revealEffect, centerX, centerY, size)
    ctx.restore()
  }
  if (gameStatus === 'won' || gameStatus === 'lost') drawGameResult()
}

function drawRevealOverlay(effect, centerX, centerY, size) {
  const elapsed = Date.now() - effect.at - effect.delay
  const progress = Math.max(0, Math.min(1, elapsed / effect.duration))
  let scale
  if (progress < 0.32) {
    const p = progress / 0.32
    scale = 1 + 0.14 * (1 - Math.pow(1 - p, 3))
  } else {
    const p = (progress - 0.32) / 0.68
    scale = 1.14 * Math.max(0, 1 - Math.pow(p, 1.25))
  }
  if (scale <= 0) return
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.scale(scale, scale)
  ctx.translate(-centerX, -centerY)
  ctx.globalAlpha = progress > 0.78 ? Math.max(0, 1 - (progress - 0.78) / 0.22) : 1
  roundRect(centerX - size / 2, centerY - size / 2 + 2, size, size, 10, '#c3d2dc')
  roundRect(centerX - size / 2, centerY - size / 2, size, size, 10, '#e7eff6', '#c5d4df')
  ctx.globalAlpha *= 0.72
  roundRect(centerX - size / 2 + 2, centerY - size / 2 + 2, size - 4, size - 4, 8, null, '#f8fbfd')
  ctx.restore()
}

function drawMineExplosion(x, y) {
  const progress = failureSequence ? Math.min(1, Math.max(0, (Date.now() - failureSequence.at) / 520)) : 1
  const burst = Math.sin(progress * Math.PI)
  const radius = cellSize * (0.3 + progress * 0.75)
  ctx.save()
  ctx.globalAlpha = 1 - progress * 0.18
  const mineColor = progress < 0.72 ? '#d86b4f' : '#c95743'
  drawMineGlyph(x, y, cellSize * (0.46 + burst * 0.16), mineColor)
  ctx.strokeStyle = '#d9574b'; ctx.lineWidth = Math.max(1.5, cellSize * 0.06); ctx.lineCap = 'round'
  for (let i = 0; i < 8; i += 1) {
    const angle = i * Math.PI / 4
    const inner = radius * 0.45
    const outer = radius
    ctx.beginPath(); ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner)
    ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer); ctx.stroke()
  }
  ctx.fillStyle = '#f2a516'
  for (let i = 0; i < 6; i += 1) {
    const angle = i * Math.PI / 3 + 0.2
    const distance = radius * (0.55 + (i % 2) * 0.28)
    ctx.beginPath(); ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, Math.max(1.5, cellSize * 0.045), 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

function drawMineGlyph(x, y, size, color) {
  const core = size * 0.29
  const toothWidth = size * 0.13
  const toothLength = size * 0.2
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = color
  for (let i = 0; i < 8; i += 1) {
    ctx.save()
    ctx.rotate(i * Math.PI / 4)
    roundRect(-toothWidth / 2, -core - toothLength + 1, toothWidth, toothLength, toothWidth * 0.35, color)
    ctx.restore()
  }
  ctx.beginPath(); ctx.arc(0, 0, core, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#f7fafc'
  ctx.beginPath(); ctx.arc(-core * 0.28, -core * 0.3, Math.max(1.2, core * 0.16), 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawFlyingFlag(effect, targetX, targetY) {
  const p = Math.min(1, Math.max(0, (Date.now() - effect.at) / 520))
  const eased = 1 - Math.pow(1 - p, 3)
  const x = effect.fromX + (targetX - effect.fromX) * eased
  const y = effect.fromY + (targetY - effect.fromY) * eased
  const radius = 25 * (1 - eased) + 1
  ctx.save()
  ctx.globalAlpha = 1 - p * 0.35
  ctx.strokeStyle = '#8293cf'; ctx.lineWidth = 2
  for (let i = 0; i < 3; i += 1) {
    const ring = radius + i * 8
    ctx.beginPath(); ctx.arc(targetX, targetY, Math.max(2, ring * (1 - p)), 0, Math.PI * 2); ctx.stroke()
  }
  ctx.translate(x, y); ctx.scale(1.7 - eased * 0.7, 1.7 - eased * 0.7)
  drawFlag(0, 0)
  ctx.restore()
}

function drawGameResult() {
  const won = gameStatus === 'won'
  ctx.fillStyle = 'rgba(247, 249, 251, 0.92)'
  ctx.fillRect(24, H * 0.69, W - 48, 116)
  text(won ? '恭喜通关' : '踩到地雷了', W / 2, H * 0.73, 22, won ? '#258c55' : '#b06a48', 'center')
  text(won ? '所有安全方块都已找到' : '雷区已揭示，重新开始试试', W / 2, H * 0.77, 13, '#667483', 'center')
  roundRect(44, H * 0.79, W - 88, 52, 26, '#8293cf')
  if (won) text('再来一局', W / 2, H * 0.79 + 26, 16, '#ffffff', 'center')
  else {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(W / 2, H * 0.79 + 12); ctx.lineTo(W / 2, H * 0.79 + 40); ctx.stroke()
    text('再来一局', W * 0.32, H * 0.79 + 26, 15, '#ffffff', 'center')
    text('再试一次', W * 0.68, H * 0.79 + 26, 15, '#ffffff', 'center')
  }
  drawResultDifficultySelector()
}

function drawResultDifficultySelector() {
  const y = H * 0.89
  drawChevron(72, y, 'left', pressedArrow === 'left')
  if (difficultyProgress < 1) {
    const outgoingProgress = Math.min(1, difficultyProgress * 2)
    const incomingProgress = Math.max(0, (difficultyProgress - 0.5) * 2)
    const outgoing = Math.pow(outgoingProgress, 3)
    const incoming = 1 - Math.pow(1 - incomingProgress, 3)
    const direction = difficultyTo > difficultyFrom ? 1 : -1
    const travel = Math.min(132, W * 0.36)
    ctx.save(); ctx.globalAlpha = 1 - outgoing
    text(difficulties[difficultyFrom].name, W / 2 - direction * outgoing * travel, y, 16, '#707174', 'center')
    ctx.globalAlpha = incoming
    text(difficulties[difficultyTo].name, W / 2 + direction * (1 - incoming) * travel, y, 16, '#707174', 'center')
    ctx.restore()
  } else text(difficulties[difficultyIndex].name, W / 2, y, 16, '#707174', 'center')
  drawChevron(W - 72, y, 'right', pressedArrow === 'right')
}

function drawFlag(x, y) {
  ctx.strokeStyle = '#f2a516'; ctx.fillStyle = '#f2a516'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(x - 5, y + 10); ctx.lineTo(x - 5, y - 11); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 4, y - 10); ctx.lineTo(x + 9, y - 5); ctx.lineTo(x - 4, y); ctx.closePath(); ctx.fill()
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
