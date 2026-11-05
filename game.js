const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')
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
const boardColumns = 9
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
// 难度从低到高，左右箭头分别对应上一级和下一级
const difficulties = [
  { name: '容易', rows: 9, mines: 10 },
  { name: '中等', rows: 11, mines: 17 },
  { name: '标准', rows: 13, mines: 25 },
  { name: '困难', rows: 15, mines: 38 },
  { name: '极难', rows: 17, mines: 54 }
]
const iconImages = {}
;['settings', 'shopping-cart', 'list', 'info-circle'].forEach((name) => {
  const image = wx.createImage()
  image.src = `assets/icons/${name}.png`
  image.onload = () => { iconImages[name] = image; if (screen === 'minesweeper') draw() }
})
const mineStatusIcon = wx.createImage()
mineStatusIcon.src = 'assets/icons/mine.png'
mineStatusIcon.onload = () => { if (screen === 'minesweeper') draw() }

function roundRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke() }
}

function text(value, x, y, size, color, align = 'left') {
  ctx.font = `${size}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(value, x, y)
}

function drawHome() {
  ctx.fillStyle = '#f7f9fb'
  ctx.fillRect(0, 0, W, H)
  text('LEISURE · PUZZLE', 44, 90, 10, '#8d9aa7')
  text('休闲益智小游戏', 44, 136, 27, '#27313b')
  text('安静地玩一会儿', 44, 170, 14, '#9aa6b2')
  text('选择游戏', 44, 246, 15, '#4f5d69')
  text('2 个游戏', W - 44, 246, 12, '#a4afb9', 'right')
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

function draw() { screen === 'home' ? drawHome() : drawMinesweeper() }
draw()

wx.onTouchStart(event => {
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
          if (!cell.flag && board.reduce((total, row) => total + row.filter(item => item.flag).length, 0) >= mineCount) return
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
  const safeRemaining = board.reduce((total, row) => total + row.filter(item => !item.mine && !item.open).length, 0)
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
  board = []
  for (let r = 0; r < boardRows; r += 1) {
    board[r] = []
    for (let c = 0; c < boardColumns; c += 1) board[r][c] = { mine: false, number: 0, open: false, flag: false }
  }
  let placed = 0
  while (placed < mineCount) {
    const r = Math.floor(Math.random() * boardRows); const c = Math.floor(Math.random() * boardColumns)
    if (!board[r][c].mine) { board[r][c].mine = true; placed += 1 }
  }
  for (let r = 0; r < boardRows; r += 1) for (let c = 0; c < boardColumns; c += 1) {
    board[r][c].number = neighbors(r, c).filter(([nr, nc]) => board[nr][nc].mine).length
  }
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

function neighbors(r, c) { const result = []; for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) { const nr = r + dr; const nc = c + dc; if ((dr || dc) && nr >= 0 && nr < boardRows && nc >= 0 && nc < boardColumns) result.push([nr, nc]) } return result }
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
  const flagCount = board.reduce((sum, row) => sum + row.filter(cell => cell.flag).length, 0)
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
