const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const { solvePuzzle } = require('../src/games/sudoku/logic')
const { createRewards } = require('../src/games/sudoku/rewards')
const { toolbar } = require('../src/games/sudoku/controls')

const entry = require.resolve('../game.js')
const width = 320
const height = 568
const storage = new Map()
const platform = {
  getStorageSync: key => storage.get(key),
  setStorageSync: (key, value) => storage.set(key, value)
}

function launch() {
  const ctx = new Proxy({ measureText: () => ({ width: 140 }) }, {
    get: (target, key) => target[key] ?? (() => {})
  })
  let start, end
  const wx = {
    ...platform,
    getWindowInfo: () => ({ windowWidth: width, windowHeight: height }),
    createCanvas: () => ({ getContext: () => ctx }),
    createImage: () => ({}),
    onTouchStart: fn => { start = fn },
    onTouchEnd: fn => { end = fn }
  }
  const noop = () => {}
  const scope = vm.createContext({ wx, require: createRequire(entry), setTimeout: noop, clearTimeout: noop, setInterval: noop, clearInterval: noop })
  vm.runInContext(fs.readFileSync(entry, 'utf8'), scope)
  function tap(x, y) {
    start({ touches: [{ x, y }] })
    end({ changedTouches: [{ x, y }] })
  }
  tap(120, 405)
  tap(width / 2, height * 0.63 + 24)
  return { runtime: vm.runInContext('sudokuRuntime', scope), tap }
}

const { runtime, tap } = launch()
function tool(key) {
  const rect = toolbar(width, height).find(button => button.key === key)
  tap(rect.x + rect.w / 2, rect.y + rect.h / 2)
}
function finish() {
  const solution = solvePuzzle(runtime.game.values)
  runtime.game.values.forEach((value, index) => {
    if (value) return
    const { boardX, boardY, cellSize } = runtime
    tap(boardX + (index % 9 + 0.5) * cellSize, boardY + (Math.floor(index / 9) + 0.5) * cellSize)
    tap(boardX + (solution[index] - 0.5) * cellSize, boardY + 9 * cellSize + 27)
  })
  assert.equal(runtime.mode, 'result')
}

tool('toggleNoteMode')
assert.equal(runtime.game.noteMode, true)
tool('toggleNoteMode')
const firstPuzzle = runtime.game.givens
for (let round = 1; round <= 6; round += 1) {
  const search = () => tap(runtime.boardX + runtime.cellSize / 2, runtime.boardY - 35)
  search()
  assert.equal(runtime.game.filter, round > 3 ? 1 : null)
  if (round > 3) search()
  if (round <= 5) {
    tool('autoNotes')
    assert.ok(runtime.game.notes.every(mask => mask === 0))
  }
  finish()
  assert.equal(runtime.result.points, round * 100)
  assert.equal(runtime.rewards.notesRemaining, round >= 5 ? 2 : 0)
  tap(width / 2, height * 0.79 + 20)
}
tool('autoNotes')
assert.ok(runtime.game.notes.some(Boolean))
tool('autoNotes')
assert.equal(runtime.rewards.notesRemaining, 1)
tool('undo')
assert.ok(runtime.game.notes.every(mask => mask === 0))
tool('autoNotes')
assert.equal(runtime.rewards.notesRemaining, 0)
tool('undo')
tool('autoNotes')
assert.ok(runtime.game.notes.every(mask => mask === 0))

tap(26, 60)
tap(120, 405)
assert.equal(runtime.rewards.searchReady, true)
const reopened = launch().runtime
reopened.stopTimer()
assert.equal(reopened.rewards.searchReady, false)
assert.equal(reopened.rewards.notesRemaining, 0)
const duplicate = reopened.rewards.complete(firstPuzzle, 4)
assert.equal(duplicate.points, 600)
assert.equal(duplicate.earned, 0)
assert.equal(reopened.rewards.searchRemaining, 3)
const rewards = createRewards(platform)
for (const [index, points] of [100, 130, 160, 200, 240].entries()) {
  assert.equal(rewards.complete([index], index).earned, points)
}
console.log('sudoku reward and touch flow tests passed')
