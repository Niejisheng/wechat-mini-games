const { touchPosition } = require('../../shared/input')

function createController(deps) {
  let press = null

  function onTouchStart(event) {
    if (deps.isBusy()) return
    const touch = event.touches[0]
    const { x, y } = touchPosition(touch)
    if (deps.isGameMode()) {
      if (x < 58 && y < 118) { press = { x, y, at: Date.now(), back: true }; return }
      if (deps.getStatus() !== 'playing' && Math.abs(y - deps.height() * 0.89) < 40) {
        const side = x < deps.width() / 2 ? 'left' : 'right'
        deps.pressResultArrow(side)
        press = { x, y, at: Date.now(), resultArrow: true }
        deps.draw()
        return
      }
      const col = Math.floor((x - deps.getBoardX()) / deps.getCellSize())
      const row = Math.floor((y - deps.getBoardY()) / deps.getCellSize())
      press = { x, y, at: Date.now(), row, col, flagged: false }
      setTimeout(() => {
        if (!press || press.at + 450 > Date.now() || press.flagged || deps.getStatus() !== 'playing') return
        if (press.row >= 0 && press.row < deps.getBoardRows() && press.col >= 0 && press.col < deps.getBoardColumns()) {
          const cell = deps.getBoard()[press.row][press.col]
          if (!cell.open) {
            if (!cell.flag && deps.countFlags() >= deps.getMineCount()) return
            cell.flag = !cell.flag
            press.flagged = true
            deps.flagCell(press.row, press.col, press.x, press.y)
          }
        }
      }, 450)
      return
    }
    if (y >= deps.height() * 0.63 && y <= deps.height() * 0.63 + 52 && x >= 44 && x <= deps.width() - 44) {
      deps.pressStart()
      return
    }
    if (Math.abs(y - deps.height() * 0.56) < 40) {
      deps.pressDifficultyArrow(x < deps.width() / 2 ? 'left' : 'right')
      deps.draw()
    }
  }

  function onTouchEnd(event) {
    if (deps.isBusy()) return
    const touch = event.changedTouches[0]
    const { x, y } = touchPosition(touch)
    if (deps.isGameMode() && press) {
      const current = press; press = null
      if (current.back) { deps.leaveGame(); return }
      if (deps.getStatus() !== 'playing') {
        if (y >= deps.height() * 0.79 && y <= deps.height() * 0.79 + 52 && x >= 44 && x <= deps.width() - 44) {
          deps.restartResult(x)
        } else if (current.resultArrow) {
          deps.releaseResultArrow(x < deps.width() / 2 ? -1 : 1)
        }
        return
      }
      const col = Math.floor((current.x - deps.getBoardX()) / deps.getCellSize())
      const row = Math.floor((current.y - deps.getBoardY()) / deps.getCellSize())
      if (row >= 0 && row < deps.getBoardRows() && col >= 0 && col < deps.getBoardColumns()) {
        const cell = deps.getBoard()[row][col]
        if (!current.flagged && Date.now() - current.at < 450 && !cell.flag) deps.reveal(row, col)
        deps.draw()
      }
      return
    }
    if (deps.isStartPressed()) { deps.releaseStart(Date.now()); return }
    if (deps.isHome() && y >= 276 && y <= 352) { deps.openGame(); return }
    if (deps.isHome()) return
    if (y < 120 && x < 90) { deps.leaveMenu(); return }
    if (Math.abs(y - deps.height() * 0.56) < 40) {
      deps.releaseDifficultyArrow(x < deps.width() / 2 ? -1 : 1)
      return
    }
    deps.clearPressedArrow()
    deps.draw()
  }

  return { onTouchStart, onTouchEnd }
}

module.exports = { createController }
