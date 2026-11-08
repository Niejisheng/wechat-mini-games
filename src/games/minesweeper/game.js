const { createGameSession } = require('../../app/game-session')

function createMinesweeperRuntime(logic) {
  const runtime = { board: [], boardRows: 9, mineCount: 10, status: 'idle', active: false, boardCommitted: false, initialBoard: null, finalBoard: null, clickHistory: [], replay: null, startedAt: 0, elapsedSeconds: 0, difficultyIndex: 0, timer: null, failureSequence: null, explodedMine: null, winCelebration: null, winCelebrationRunning: false, revealEffects: [], revealAnimationRunning: false, collapseEffects: [], flagAnimation: null, numberFeedback: null, pressedArrow: '', difficultyFrom: 0, difficultyTo: 0, difficultyProgress: 1, arrowEffect: { side: '', phase: 'idle', progress: 1, rotation: 0 }, startPressed: false, startPressAt: 0, startLongPress: false, boardX: 20, boardY: 150, cellSize: 36, audioContext: null }
  runtime.stopTimer = () => { if (runtime.timer) clearTimeout(runtime.timer); runtime.timer = null }
  runtime.startTimer = (isActive, draw) => { runtime.stopTimer(); const tick = () => { if (!isActive() || runtime.status !== 'playing' || !runtime.startedAt) return; runtime.elapsedSeconds = Math.floor((Date.now() - runtime.startedAt) / 1000); draw(); runtime.timer = setTimeout(tick, 1000) }; tick() }
  return runtime
}

function createMinesweeperGame({ draw, controller, enter, exit }) {
  return { id: 'minesweeper', ...createGameSession({ draw, controller, enter, exit }) }
}

module.exports = { createMinesweeperGame, createMinesweeperRuntime }
