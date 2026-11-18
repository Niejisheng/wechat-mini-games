const { touchPosition } = require('../../shared/input')
const { toolbar } = require('./controls')

function createController(deps) {
  let press = null
  let longPressTimer = null

  function onTouchStart(event) {
    if (longPressTimer) clearTimeout(longPressTimer)
    const position = touchPosition(event.touches[0])
    press = { ...position, longPressed: false }
    if (deps.getMode() === 'menu') {
      if (position.y >= deps.height() * 0.63 && position.y <= deps.height() * 0.63 + 52 && position.x >= 44 && position.x <= deps.width() - 44) { press.start = true; deps.pressStart() }
      else if (Math.abs(position.y - deps.height() * 0.56) < 40) { press.arrow = true; deps.pressDifficultyArrow(position.x < deps.width() / 2 ? 'left' : 'right') }
      return
    }
    if (deps.getMode() === 'result') return
    longPressTimer = setTimeout(() => {
      if (!press || !deps.getFilter()) return
      const col = Math.floor((press.x - deps.getBoardX()) / deps.getCellSize())
      const row = Math.floor((press.y - deps.getBoardY()) / deps.getCellSize())
      if (row >= 0 && row < 9 && col >= 0 && col < 9) {
        press.longPressed = true
        deps.exclude(row * 9 + col, deps.getFilter())
      }
    }, 450)
  }

  function onTouchEnd(event) {
    if (!press) return
    if (longPressTimer) clearTimeout(longPressTimer)
    const current = press; press = null
    if (current.longPressed) return
    const { x, y } = touchPosition(event.changedTouches[0])
    if (deps.getMode() === 'menu') {
      if (x < 90 && y < 120) { deps.leave(); return }
      if (current.start) { deps.releaseStart(Date.now()); return }
      if (current.arrow) { deps.releaseDifficultyArrow(x < deps.width() / 2 ? -1 : 1); return }
      if (y >= deps.height() * 0.63 && y <= deps.height() * 0.63 + 52 && x >= 44 && x <= deps.width() - 44) { deps.startGame(); return }
      if (Math.abs(y - deps.height() * 0.56) < 40) { deps.changeDifficulty(x < deps.width() / 2 ? -1 : 1); return }
      return
    }
    if (deps.getMode() === 'result') {
      if (y >= deps.height() * 0.79 && y <= deps.height() * 0.79 + 52 && x >= 44 && x <= deps.width() - 44) { deps.restartGame(); return }
      if (Math.abs(y - deps.height() * 0.89) < 40) { deps.changeDifficulty(x < deps.width() / 2 ? -1 : 1); return }
      if (x < 90 && y < 120) { deps.leave(); return }
      return
    }
    if (x < 90 && y < 100) { deps.leave(); return }
    const button = toolbar(deps.width(), deps.height()).find(({ x: left, y: top, w, h }) =>
      x >= left && x < left + w && y >= top && y < top + h)
    if (button) { deps[button.key](); return }
    const filterY = deps.getBoardY() - 35
    if (Math.abs(y - filterY) < 24 && x >= deps.getBoardX() && x <= deps.getBoardX() + deps.getCellSize() * 9) {
      deps.filter(Math.floor((x - deps.getBoardX()) / deps.getCellSize()) + 1); return
    }
    if (x >= deps.getBoardX() && x <= deps.getBoardX() + deps.getCellSize() * 9 && y >= deps.getBoardY() && y <= deps.getBoardY() + deps.getCellSize() * 9) {
      const col = Math.floor((x - deps.getBoardX()) / deps.getCellSize())
      const row = Math.floor((y - deps.getBoardY()) / deps.getCellSize())
      deps.select(row * 9 + col); return
    }
    const keypadY = deps.getBoardY() + deps.getCellSize() * 9 + 27
    if (Math.abs(y - keypadY) < 26 && x >= deps.getBoardX() && x <= deps.getBoardX() + deps.getCellSize() * 9) {
      deps.input(Math.floor((x - deps.getBoardX()) / deps.getCellSize()) + 1)
    }
  }

  return { onTouchStart, onTouchEnd, destroy() { if (longPressTimer) clearTimeout(longPressTimer) } }
}

module.exports = { createController }
