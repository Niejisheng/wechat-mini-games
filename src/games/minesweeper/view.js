function createMinesweeperView({ ctx, roundRect, text }) {
  function drawBackArrow(x, y) { ctx.strokeStyle = '#8a8b8f'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(x, y + 12); ctx.lineTo(x + 12, y + 24); ctx.stroke() }
  function drawMineLogo(cx, cy) { ctx.fillStyle = '#8293cf'; ctx.beginPath(); ctx.arc(cx, cy, 66, 0, Math.PI * 2); ctx.fill(); const teeth = [[0, -78], [55, -55], [78, 0], [55, 55], [0, 78], [-55, 55], [-78, 0], [-55, -55]]; teeth.forEach(([dx, dy]) => { ctx.save(); ctx.translate(cx + dx, cy + dy); ctx.rotate(Math.atan2(dy, dx)); roundRect(-10, -17, 20, 34, 5, '#8293cf'); ctx.restore() }); roundRect(cx - 19, cy - 19, 38, 38, 6, '#ffffff') }
  function drawFlag(x, y) { ctx.strokeStyle = '#f2a516'; ctx.fillStyle = '#f2a516'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 5, y + 10); ctx.lineTo(x - 5, y - 11); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 4, y - 10); ctx.lineTo(x + 9, y - 5); ctx.lineTo(x - 4, y); ctx.closePath(); ctx.fill() }
  function drawMineGlyph(x, y, size, color) { const core = size * 0.29; const toothWidth = size * 0.13; const toothLength = size * 0.2; ctx.save(); ctx.translate(x, y); ctx.fillStyle = color; for (let i = 0; i < 8; i += 1) { ctx.save(); ctx.rotate(i * Math.PI / 4); roundRect(-toothWidth / 2, -core - toothLength + 1, toothWidth, toothLength, toothWidth * 0.35, color); ctx.restore() } ctx.beginPath(); ctx.arc(0, 0, core, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f7fafc'; ctx.beginPath(); ctx.arc(-core * 0.28, -core * 0.3, Math.max(1.2, core * 0.16), 0, Math.PI * 2); ctx.fill(); ctx.restore() }
  function drawCell({ cell, x, y, cellSize, gap, row, col, effect, flagFx, exploded, failure, revealEffect, drawFlyingFlag, drawMineExplosion }) {
    let effectProgress = effect ? Math.max(0, Math.min(1, (Date.now() - effect.at) / 360)) : 0
    const effectAmount = effect ? Math.sin(effectProgress * Math.PI) : 0
    const centerX = x + cellSize / 2; const centerY = y + cellSize / 2; const inset = gap / 2; const size = cellSize - gap
    ctx.save()
    if (effect) { ctx.translate(centerX, centerY + effectAmount * 6); ctx.scale(1 - effectAmount * 0.2, 1 - effectAmount * 0.2); ctx.translate(-centerX, -centerY); ctx.globalAlpha = 1 - effectAmount * 0.35 }
    const fill = cell.flag ? '#71899e' : (cell.open ? '#f7fafc' : '#e7eff6')
    if (!cell.open) { roundRect(x + inset, y + inset + 2, size, size, 10, '#c3d2dc'); roundRect(x + inset, y + inset, size, size, 10, fill, cell.flag ? '#71899e' : '#c5d4df'); ctx.globalAlpha = 0.72; roundRect(x + inset + 2, y + inset + 2, size - 4, size - 4, 8, null, '#f8fbfd'); ctx.globalAlpha = 1 } else roundRect(x + inset, y + inset, size, size, 10, fill, '#cfdae2')
    const center = { x: centerX, y: centerY }
    if (cell.flag && !cell.open && flagFx) drawFlyingFlag(flagFx, centerX, centerY)
    else if (cell.flag && !cell.open) drawFlag(centerX, centerY)
    else if (cell.open && cell.mine) { if (failure && failure.phase === 'explode' && failure.r === row && failure.c === col) drawMineExplosion(centerX, centerY); else drawMineGlyph(centerX, centerY, cellSize * 0.58, exploded ? '#d86b4f' : '#5f7180') }
    else if (cell.open && cell.number) text(String(cell.number), centerX, centerY, 22, ['','#2864a3','#258c55','#7b5aa0','#b06a48'][cell.number] || '#64788c', 'center')
    if (revealEffect) drawRevealOverlay(revealEffect, centerX, centerY, size)
    ctx.restore()
  }
  function drawRevealOverlay(effect, centerX, centerY, size) {
    const elapsed = Date.now() - effect.at - effect.delay
    const progress = Math.max(0, Math.min(1, elapsed / effect.duration))
    let scale
    if (progress < 0.32) { const p = progress / 0.32; scale = 1 + 0.14 * (1 - Math.pow(1 - p, 3)) } else { const p = (progress - 0.32) / 0.68; scale = 1.14 * Math.max(0, 1 - Math.pow(p, 1.25)) }
    if (scale <= 0) return
    ctx.save(); ctx.translate(centerX, centerY); ctx.scale(scale, scale); ctx.translate(-centerX, -centerY)
    ctx.globalAlpha = progress > 0.78 ? Math.max(0, 1 - (progress - 0.78) / 0.22) : 1
    roundRect(centerX - size / 2, centerY - size / 2 + 2, size, size, 10, '#c3d2dc')
    roundRect(centerX - size / 2, centerY - size / 2, size, size, 10, '#e7eff6', '#c5d4df')
    ctx.globalAlpha *= 0.72
    roundRect(centerX - size / 2 + 2, centerY - size / 2 + 2, size - 4, size - 4, 8, null, '#f8fbfd')
    ctx.restore()
  }
  function drawMineExplosion({ x, y, cellSize, progress }) {
    const burst = Math.sin(progress * Math.PI); const radius = cellSize * (0.3 + progress * 0.75)
    ctx.save(); ctx.globalAlpha = 1 - progress * 0.18
    drawMineGlyph(x, y, cellSize * (0.46 + burst * 0.16), progress < 0.72 ? '#d86b4f' : '#c95743')
    ctx.strokeStyle = '#d9574b'; ctx.lineWidth = Math.max(1.5, cellSize * 0.06); ctx.lineCap = 'round'
    for (let i = 0; i < 8; i += 1) { const angle = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(angle) * radius * 0.45, y + Math.sin(angle) * radius * 0.45); ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius); ctx.stroke() }
    ctx.fillStyle = '#f2a516'
    for (let i = 0; i < 6; i += 1) { const angle = i * Math.PI / 3 + 0.2; const distance = radius * (0.55 + (i % 2) * 0.28); ctx.beginPath(); ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, Math.max(1.5, cellSize * 0.045), 0, Math.PI * 2); ctx.fill() }
    ctx.restore()
  }
  function drawFlyingFlag(effect, targetX, targetY) {
    const p = Math.min(1, Math.max(0, (Date.now() - effect.at) / 520)); const eased = 1 - Math.pow(1 - p, 3); const x = effect.fromX + (targetX - effect.fromX) * eased; const y = effect.fromY + (targetY - effect.fromY) * eased; const radius = 25 * (1 - eased) + 1
    ctx.save(); ctx.globalAlpha = 1 - p * 0.35; ctx.strokeStyle = '#8293cf'; ctx.lineWidth = 2
    for (let i = 0; i < 3; i += 1) { const ring = radius + i * 8; ctx.beginPath(); ctx.arc(targetX, targetY, Math.max(2, ring * (1 - p)), 0, Math.PI * 2); ctx.stroke() }
    ctx.translate(x, y); ctx.scale(1.7 - eased * 0.7, 1.7 - eased * 0.7); drawFlag(0, 0); ctx.restore()
  }
  function drawResultPanel({ width, height, won, drawDifficultySelector }) {
    text(won ? '恭喜通关' : '踩到地雷了', width / 2, height * 0.755, 22, won ? '#258c55' : '#b06a48', 'center')
    roundRect(44, height * 0.79, width - 88, 52, 26, '#8293cf')
    if (won) text('新游戏', width / 2, height * 0.79 + 26, 16, '#ffffff', 'center')
    else { ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(width / 2, height * 0.79 + 12); ctx.lineTo(width / 2, height * 0.79 + 40); ctx.stroke(); text('新游戏', width * 0.32, height * 0.79 + 26, 15, '#ffffff', 'center'); text('再试一次', width * 0.68, height * 0.79 + 26, 15, '#ffffff', 'center') }
    drawDifficultySelector()
  }
  function drawWinCelebration({ startedAt, width, height }) {
    if (!startedAt) return
    const progress = Math.min(1, (Date.now() - startedAt) / 2800); const centerX = width / 2; const centerY = height * 0.735; const pulse = 0.5 + Math.sin(progress * Math.PI * 5) * 0.5; const fade = progress > 0.82 ? 1 - (progress - 0.82) / 0.18 : 1
    ctx.save(); ctx.globalAlpha = 0.12 + pulse * 0.06; ctx.fillStyle = '#9bc6ac'; ctx.beginPath(); ctx.arc(centerX, centerY, 32 + pulse * 7, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 0.28 * fade; ctx.strokeStyle = '#78a994'; ctx.lineWidth = 2; [42 + progress * 28, 56 + progress * 34].forEach(radius => { ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.stroke() })
    ctx.globalAlpha = 0.22 * fade; ctx.strokeStyle = '#b5d3c1'; ctx.lineWidth = 1
    for (let i = 0; i < 12; i += 1) { const angle = i * Math.PI * 2 / 12; const inner = 30 + pulse * 5; const outer = inner + 13 + Math.min(1, progress * 2) * 18; ctx.beginPath(); ctx.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner); ctx.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer); ctx.stroke() }
    const particles = ['#78a994', '#8293cf', '#edb36d', '#b5c9d9', '#9ebcae', '#d89a72']
    particles.forEach((color, i) => { const angle = i * Math.PI * 2 / particles.length + 0.25; const distance = 24 + progress * 88; const x = centerX + Math.cos(angle) * distance; const y = centerY + Math.sin(angle) * distance + progress * progress * 20; const size = 2 + (i % 3); ctx.globalAlpha = (1 - progress) * 0.82; ctx.fillStyle = color; ctx.save(); ctx.translate(x, y); ctx.rotate(progress * 3 + i); if (i % 2) { ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill() } else { ctx.beginPath(); ctx.moveTo(0, -size * 1.5); ctx.lineTo(size * 1.2, size); ctx.lineTo(-size * 1.2, size); ctx.closePath(); ctx.fill() } ctx.restore() })
    ctx.globalAlpha = 0.86 + pulse * 0.1; ctx.fillStyle = '#78a994'; ctx.beginPath(); ctx.arc(centerX, centerY, 17 + pulse * 2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(centerX - 7, centerY); ctx.lineTo(centerX - 2, centerY + 5); ctx.lineTo(centerX + 8, centerY - 6); ctx.stroke(); ctx.restore()
  }
  function drawDifficultySelector({ width, height, difficulties, index, from, to, progress, drawChevron }) {
    const y = height * 0.56; drawChevron(72, y, 'left');
    if (progress < 1) { const outgoingProgress = Math.min(1, progress * 2); const incomingProgress = Math.max(0, (progress - 0.5) * 2); const outgoing = Math.pow(outgoingProgress, 3); const incoming = 1 - Math.pow(1 - incomingProgress, 3); const direction = to > from ? 1 : -1; const travel = Math.min(132, width * 0.36); ctx.save(); ctx.globalAlpha = 1 - outgoing; text(difficulties[from].name, width / 2 - direction * outgoing * travel, y, 16, '#707174', 'center'); ctx.globalAlpha = incoming; text(difficulties[to].name, width / 2 + direction * (1 - incoming) * travel, y, 16, '#707174', 'center'); ctx.restore() } else text(difficulties[index].name, width / 2, y, 16, '#707174', 'center')
    drawChevron(width - 72, y, 'right')
  }
  function drawResultDifficultySelector({ width, height, difficulties, index, from, to, progress, drawChevron }) {
    const y = height * 0.89; drawChevron(72, y, 'left')
    if (progress < 1) { const outgoingProgress = Math.min(1, progress * 2); const incomingProgress = Math.max(0, (progress - 0.5) * 2); const outgoing = Math.pow(outgoingProgress, 3); const incoming = 1 - Math.pow(1 - incomingProgress, 3); const direction = to > from ? 1 : -1; const travel = Math.min(132, width * 0.36); ctx.save(); ctx.globalAlpha = 1 - outgoing; text(difficulties[from].name, width / 2 - direction * outgoing * travel, y, 16, '#707174', 'center'); ctx.globalAlpha = incoming; text(difficulties[to].name, width / 2 + direction * (1 - incoming) * travel, y, 16, '#707174', 'center'); ctx.restore() } else text(difficulties[index].name, width / 2, y, 16, '#707174', 'center')
    drawChevron(width - 72, y, 'right')
  }
  return { drawBackArrow, drawMineLogo, drawFlag, drawMineGlyph, drawCell, drawRevealOverlay, drawMineExplosion, drawFlyingFlag, drawResultPanel, drawWinCelebration, drawDifficultySelector, drawResultDifficultySelector }
}
module.exports = { createMinesweeperView }
