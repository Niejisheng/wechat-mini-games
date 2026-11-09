function createSudokuView({ ctx, getWidth, getHeight, roundRect, text, logic }) {
  function layout() {
    const width = Math.min(getWidth() - 24, 360)
    const cellSize = width / 9
    const boardX = (getWidth() - width) / 2
    const boardHeight = cellSize * 9
    const centeredBoardY = (getHeight() - boardHeight) / 2 + 8
    const minimumBoardY = 210
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
    ctx.fillStyle = !searchMode && index === selected ? '#b9ccef' : possible ? '#f5e5d7' : same ? '#d9e6fa' : related ? '#e8eef6' : '#ffffff'
    ctx.fillRect(x, y, size, size)
    ctx.strokeStyle = error ? '#d86b4f' : '#d8e0e6'; ctx.lineWidth = 1; ctx.strokeRect(x, y, size, size)
    if (value) text(String(value), x + size / 2, y + size / 2, 21, same ? '#5d78b2' : given ? '#33414d' : '#8293cf', 'center')
    else logic.DIGITS.forEach(digit => { if (notes & (1 << digit)) text(String(digit), x + ((digit - 1) % 3 + 0.5) * size / 3, y + (Math.floor((digit - 1) / 3) + 0.5) * size / 3, 9, '#71818f', 'center') })
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
    ctx.strokeStyle = '#8293a8'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'
    // 第一行只保留返回按钮，标题和状态信息向下错开。
    ctx.beginPath(); ctx.moveTo(16, 44); ctx.lineTo(10, 50); ctx.lineTo(16, 56); ctx.stroke()
    text('片刻专注，步步有解', 24, 88, 25, '#27313b')
    text('.', 24 + ctx.measureText('片刻专注，步步有解').width + 2, 88, 25, '#8293cf')
    ctx.fillStyle = '#78a994'; ctx.beginPath(); ctx.arc(28, 128, 3.5, 0, Math.PI * 2); ctx.fill()
    text(difficulty, 40, 128, 13, '#33414d')
    text('/', 78, 128, 12, '#a4afb9')
    text('多想一步', 98, 128, 12, '#8293a8')
    drawClock(getWidth() - 76, 128)
    text(formatTime(elapsed), getWidth() - 22, 128, 13, '#8293a8', 'right')
  }

  function drawControls({ width, height, canUndo, selected, won }) {
    const y = height - 84
    const buttons = [
      { key: 'auto-notes', label: '自动笔记', width: 64 },
      { key: 'erase', label: '擦除', width: 48 },
      { key: 'undo', label: '撤销', width: 48 }
    ]
    let right = width - 24
    buttons.slice().reverse().forEach(button => {
      const x = right - button.width
      const enabled = !won && (button.key === 'auto-notes' || button.key === 'undo' ? (button.key === 'auto-notes' || canUndo) : selected !== null)
      roundRect(x, y - 15, button.width, 30, 10, enabled ? '#ffffff' : '#eef2f4', enabled ? '#d3dde5' : '#e2e7eb')
      text(button.label, x + button.width / 2, y + 1, 11, enabled ? '#66788a' : '#b1bbc3', 'center')
      right = x - 7
    })
  }

  function drawFilterCaption({ y }) {
    text('寻找数字', 24, y, 13, '#536b7d')
    text('点击查看可能位置', 91, y, 10, '#a0adb7')
    text('角标为剩余数量', getWidth() - 24, y, 10, '#8798a5', 'right')
  }

  function drawHint({ filter }) {
    text(filter ? '淡橙色为候选位置 · 长按候选格排除或恢复' : '点击上方数字寻找候选位置', getWidth() / 2, getHeight() - 16, 10, '#a4afb9', 'center')
  }

  function drawResultPanel({ width, height }) {
    const panelTop = height * 0.745
    ctx.save()
    ctx.fillStyle = 'rgba(247, 249, 251, 0.96)'
    ctx.beginPath()
    ctx.moveTo(0, panelTop + 18)
    ctx.quadraticCurveTo(0, panelTop, 18, panelTop)
    ctx.lineTo(width - 18, panelTop)
    ctx.quadraticCurveTo(width, panelTop, width, panelTop + 18)
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#e1e7ec'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(18, panelTop)
    ctx.lineTo(width - 18, panelTop)
    ctx.stroke()
    ctx.restore()
    text('恭喜通关', width / 2, height * 0.765, 22, '#258c55', 'center')
    roundRect(44, height * 0.79, width - 88, 52, 26, '#8293cf')
    text('新游戏', width / 2, height * 0.79 + 26, 16, '#ffffff', 'center')
  }

  function drawCelebration({ event, startedAt, width, height, boardX, boardY, cellSize }) {
    if (!event || !startedAt) return
    const elapsed = (Date.now() - startedAt) / 1000
    const duration = event.win ? 2.6 : event.digits.length ? 1.7 : 1.2
    const colors = event.digits.length && !event.win ? ['#e7b954', '#f1cb7a', '#8dcbbf', '#9cb2ee', '#eca98b'] : ['#6599ed', '#9cb2ee', '#e7b954', '#8dcbbf', '#e8a0ac']
    const origins = event.win ? [[0.18, 0.24], [0.78, 0.26], [0.5, 0.52], [0.18, 0.78], [0.82, 0.76]] : event.units.map(unit => {
      const cells = logic.UNITS[unit]
      return [cells.reduce((sum, index) => sum + (index % 9 + 0.5) / 9, 0) / 9, cells.reduce((sum, index) => sum + (Math.floor(index / 9) + 0.5) / 9, 0) / 9]
    })
    if (!event.win) event.digitCells.forEach(index => origins.push([(index % 9 + 0.5) / 9, (Math.floor(index / 9) + 0.5) / 9]))
    const perOrigin = event.win ? 38 : Math.min(20, Math.max(8, Math.floor(144 / Math.max(1, origins.length))))
    ctx.save(); ctx.globalCompositeOperation = 'source-over'
    // 粒子只在棋盘附近活动，允许少量越界来保留呼吸感。
    const particleMargin = Math.min(26, cellSize * 0.7)
    ctx.beginPath(); ctx.rect(boardX - particleMargin, boardY - particleMargin, cellSize * 9 + particleMargin * 2, cellSize * 9 + particleMargin * 2); ctx.clip()
    const regionElapsed = Math.min(1, elapsed / 1.15)
    if (!event.win) {
      // 第一段：完成的行、列、宫依次亮起，并扫过一道高光。
      event.units.forEach((unit, order) => {
        const local = Math.max(0, Math.min(1, (elapsed - order * 0.08) / 0.72))
        if (!local) return
        let x = boardX; let y = boardY; let w = cellSize * 9; let h = cellSize
        if (unit < 9) y = boardY + unit * cellSize
        if (unit >= 9 && unit < 18) { x = boardX + (unit - 9) * cellSize; y = boardY; w = cellSize; h = cellSize * 9 }
        if (unit >= 18) { const box = unit - 18; x = boardX + (box % 3) * cellSize * 3; y = boardY + Math.floor(box / 3) * cellSize * 3; w = cellSize * 3; h = cellSize * 3 }
        const fade = Math.min(1, local * 5) * Math.max(0, 1 - Math.max(0, local - 0.65) / 0.35)
        ctx.globalAlpha = fade * 0.28; ctx.fillStyle = '#b7cef3'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2)
        ctx.globalAlpha = fade * 0.9; ctx.strokeStyle = '#8eafe8'; ctx.lineWidth = 2.2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2)
        const sweep = (local * 1.35 - 0.15) * (w + h)
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.globalAlpha = fade * 0.55; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(3, cellSize * 0.12)
        ctx.beginPath(); ctx.moveTo(x + sweep - h, y); ctx.lineTo(x + sweep, y + h); ctx.stroke(); ctx.restore()
      })
      // 数字完成时，9 个数字格分别出现金色闪烁。
      event.digitCells.forEach((index, order) => {
        const local = Math.max(0, Math.min(1, (elapsed - order * 0.045) / 1.05))
        if (!local) return
        const x = boardX + (index % 9) * cellSize; const y = boardY + Math.floor(index / 9) * cellSize
        const pulse = Math.sin(Math.min(1, local) * Math.PI)
        ctx.globalAlpha = (1 - local) * 0.9 + pulse * 0.22; ctx.strokeStyle = '#dfb85e'; ctx.lineWidth = 2
        ctx.shadowColor = '#f6d779'; ctx.shadowBlur = 9 * pulse
        ctx.strokeRect(x + 3, y + 3, cellSize - 6, cellSize - 6); ctx.shadowBlur = 0
        ctx.globalAlpha = Math.max(0, 1 - local) * 0.7; ctx.fillStyle = '#f6d779'; ctx.beginPath(); ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * (0.12 + pulse * 0.12), 0, Math.PI * 2); ctx.fill()
      })
    }
    origins.forEach(([originX, originY], origin) => {
      for (let i = 0; i < perOrigin; i += 1) {
        const angle = Math.PI * 2 * i / perOrigin
        const speed = (event.win ? 85 : 40) + ((i * 47 + origin * 19) % 95)
        const delay = event.win ? origin * 0.18 : Math.min(origin * 0.025, 0.3)
        const t = elapsed - delay
        if (t < 0 || t > (event.win ? 1.7 : event.digits.length ? 1.35 : 1)) continue
        const x = originX * width + Math.cos(angle) * speed * t
        const y = originY * height + Math.sin(angle) * speed * t + 22 * t * t
        const size = 2 + ((i * 13 + origin) % 4)
        ctx.globalAlpha = Math.max(0, 1 - t / (event.win ? 1.7 : event.digits.length ? 1.35 : 1))
        ctx.fillStyle = colors[i % colors.length]
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 1.4)
        if (event.digits.length || i % 3 === 0) {
          ctx.beginPath()
          for (let point = 0; point < 10; point += 1) { const a = point * Math.PI / 5 - Math.PI / 2; const radius = point % 2 ? size * 0.42 : size; if (!point) ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius); else ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius) }
          ctx.closePath(); ctx.fill()
        } else { ctx.beginPath(); ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2); ctx.fill() }
        ctx.restore()
      }
    })
    if (event.win) for (let i = 0; i < 45; i += 1) {
      const t = elapsed - (i % 11) * 0.06
      if (t < 0 || t > 1.7) continue
      ctx.globalAlpha = Math.max(0, 1 - t / 1.7); ctx.fillStyle = colors[i % colors.length]
      const boardWidth = cellSize * 9
      const x = boardX + ((i * 53 % 101) / 100) * boardWidth + Math.sin(i) * 20 * t
      const y = boardY - 20 + (75 + (i * 17 % 95)) * t + 22 * t * t
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 1.4); ctx.fillRect(-2, -2, 4, 4); ctx.restore()
    }
    // 第三段：短暂的中心收束光，给每次完成一个明确的落点。
    if (event.win || regionElapsed > 0.72) {
      const settle = Math.max(0, Math.min(1, (elapsed - (event.win ? 1.9 : 0.78)) / 0.45))
      ctx.globalAlpha = (1 - settle) * 0.32; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(boardX + cellSize * 4.5, boardY + cellSize * 4.5, 18 + settle * 72, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.restore()
  }

  return { layout, formatTime, drawSearchDigit, drawClock, drawCell, drawKeypad, drawFilterCards, drawGridBorders, drawPageHeader, drawControls, drawFilterCaption, drawHint, drawResultPanel, drawCelebration }
}

module.exports = { createSudokuView }
