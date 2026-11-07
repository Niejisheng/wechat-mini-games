function createSudokuView({ ctx, getWidth, getHeight, roundRect, text, logic }) {
  function layout() {
    const width = Math.min(getWidth() - 24, 360)
    const cellSize = width / 9
    const boardX = (getWidth() - width) / 2
    const boardHeight = cellSize * 9
    const centeredBoardY = (getHeight() - boardHeight) / 2 + 8
    const minimumBoardY = 190
    const maximumBoardY = Math.max(minimumBoardY, getHeight() - boardHeight - 96)
    return { width, cellSize, boardX, boardY: Math.max(minimumBoardY, Math.min(maximumBoardY, centeredBoardY)) }
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60)
    const remainder = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
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

  function drawCell({ index, x, y, size, value, given, notes, selected, activeDigit, searchMode, possible, related, same, error }) {
    ctx.fillStyle = !searchMode && index === selected ? '#dce5f8' : possible ? '#f5e5d7' : same ? '#edf1f5' : '#ffffff'
    ctx.fillRect(x, y, size, size)
    ctx.strokeStyle = error ? '#d86b4f' : '#d8e0e6'; ctx.lineWidth = 1; ctx.strokeRect(x, y, size, size)
    if (related && index !== selected) { ctx.fillStyle = '#f3f6f8'; ctx.fillRect(x + 1, y + 1, size - 2, size - 2) }
    if (value) text(String(value), x + size / 2, y + size / 2, 21, given ? '#33414d' : '#8293cf', 'center')
    else logic.DIGITS.forEach(digit => { if (notes & (1 << digit)) text(String(digit), x + ((digit - 1) % 3 + 0.5) * size / 3, y + (Math.floor((digit - 1) / 3) + 0.5) * size / 3, 8, '#8b9aa6', 'center') })
    if (searchMode && selected === index) { ctx.strokeStyle = '#8293cf'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, size - 4, size - 4) }
  }

  function drawKeypad({ boardX, boardY, size, boardWidth, noteMode }) {
    const keypadY = Math.min(getHeight() - 48, boardY + boardWidth + 56)
    logic.DIGITS.forEach((digit, index) => {
      const x = boardX + (index + 0.5) * size
      roundRect(x - size * 0.32, keypadY - 18, size * 0.64, 36, 12, noteMode ? '#f0f3f7' : '#ffffff', '#d7dfe5')
      text(String(digit), x, keypadY, 17, '#667483', 'center')
    })
    return keypadY
  }

  function drawFilterCards({ boardX, filterY, size, filter, values }) {
    logic.DIGITS.forEach((digit, index) => {
      const x = boardX + (index + 0.5) * size
      const active = filter === digit
      const remaining = Math.max(0, 9 - values.filter(value => value === digit).length)
      const completed = remaining === 0
      const cardFill = completed ? '#eef2f4' : active ? '#e5edf9' : '#ffffff'
      const cardStroke = completed ? '#e2e7eb' : active ? '#8293cf' : '#d8e1e8'
      const digitColor = completed ? '#a9b4bc' : active ? '#5e78ad' : '#536b7d'
      roundRect(x - size * 0.43, filterY - 19, size * 0.86, 42, 9, completed ? '#e1e7eb' : '#d6e0e8')
      roundRect(x - size * 0.43, filterY - 21, size * 0.86, 42, 9, cardFill, cardStroke)
      drawSearchDigit(String(digit), x, filterY + 2, digitColor)
      ctx.fillStyle = completed ? '#87ad9b' : '#ed9a58'; ctx.beginPath(); ctx.arc(x + size * 0.31, filterY - 15, 7.5, 0, Math.PI * 2); ctx.fill()
      if (completed) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + size * 0.25, filterY - 15); ctx.lineTo(x + size * 0.29, filterY - 12); ctx.lineTo(x + size * 0.36, filterY - 18); ctx.stroke() }
      else text(String(remaining), x + size * 0.31, filterY - 15, 8, '#ffffff', 'center')
    })
  }

  function drawGridBorders({ boardX, boardY, size, boardWidth }) {
    ctx.strokeStyle = '#95a4ae'; ctx.lineWidth = 2
    for (let i = 0; i <= 9; i += 3) {
      ctx.beginPath(); ctx.moveTo(boardX + i * size, boardY); ctx.lineTo(boardX + i * size, boardY + boardWidth); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(boardX, boardY + i * size); ctx.lineTo(boardX + boardWidth, boardY + i * size); ctx.stroke()
    }
  }

  function drawPageHeader({ elapsed, difficulty = '中等' }) {
    ctx.fillStyle = '#f7f9fb'; ctx.fillRect(0, 0, getWidth(), getHeight())
    text('A LITTLE FOCUS, A LITTLE JOY', 24, 24, 9, '#8293a8')
    text('片刻专注，步步有解', 24, 57, 25, '#27313b')
    text('.', 24 + ctx.measureText('片刻专注，步步有解').width + 2, 57, 25, '#8293cf')
    ctx.fillStyle = '#78a994'; ctx.beginPath(); ctx.arc(28, 103, 3.5, 0, Math.PI * 2); ctx.fill()
    text(difficulty, 40, 103, 13, '#33414d')
    text('/', 78, 103, 12, '#a4afb9')
    text('多想一步', 98, 103, 12, '#8293a8')
    drawClock(getWidth() - 62, 103)
    text(formatTime(elapsed), getWidth() - 22, 103, 13, '#8293a8', 'right')
  }

  function drawFilterCaption({ y }) {
    text('寻找数字', 24, y, 13, '#536b7d')
    text('点击查看可能位置', 91, y, 10, '#a0adb7')
    text('角标为剩余数量', getWidth() - 24, y, 10, '#8798a5', 'right')
  }

  function drawHint({ filter }) {
    text(filter ? '淡橙色为候选位置 · 长按候选格排除或恢复' : '点击上方数字寻找候选位置', getWidth() / 2, getHeight() - 16, 10, '#a4afb9', 'center')
  }

  return { layout, formatTime, drawSearchDigit, drawClock, drawCell, drawKeypad, drawFilterCards, drawGridBorders, drawPageHeader, drawFilterCaption, drawHint }
}

module.exports = { createSudokuView }
