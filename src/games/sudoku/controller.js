const { touchPosition } = require('../../shared/input')

function createController(deps) {
  let press = null
  let longPressTimer = null

  function onTouchStart(event) {
    if (longPressTimer) clearTimeout(longPressTimer)
    const position = touchPosition(event.touches[0])
    press = { ...position, longPressed: false }
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
    if (x < 90 && y < 100) { deps.leave(); return }
    if (x >= deps.width() - 90 && y >= 35 && y <= 85) { deps.toggleNoteMode(); return }
    const filterY = deps.getBoardY() - 35
    if (Math.abs(y - filterY) < 24 && x >= deps.getBoardX() && x <= deps.getBoardX() + deps.getCellSize() * 9) {
      deps.filter(Math.floor((x - deps.getBoardX()) / deps.getCellSize()) + 1); return
    }
    if (x >= deps.getBoardX() && x <= deps.getBoardX() + deps.getCellSize() * 9 && y >= deps.getBoardY() && y <= deps.getBoardY() + deps.getCellSize() * 9) {
      const col = Math.floor((x - deps.getBoardX()) / deps.getCellSize())
      const row = Math.floor((y - deps.getBoardY()) / deps.getCellSize())
      deps.select(row * 9 + col); return
    }
    const keypadY = Math.min(deps.height() - 48, deps.getBoardY() + deps.getCellSize() * 9 + 56)
    if (Math.abs(y - keypadY) < 26 && x >= deps.getBoardX() && x <= deps.getBoardX() + deps.getCellSize() * 9) {
      deps.input(Math.floor((x - deps.getBoardX()) / deps.getCellSize()) + 1)
    }
  }

  return { onTouchStart, onTouchEnd, destroy() { if (longPressTimer) clearTimeout(longPressTimer) } }
}

module.exports = { createController }
