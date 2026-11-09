const assert = require('assert')
const registry = require('../src/app/game-registry')
const { createGameSession } = require('../src/app/game-session')

const id = `test-${Date.now()}`
let entered = false
let destroyed = false
assert.strictEqual(registry.registerGame({ id, name: '测试游戏', description: '', icon: 'test' }), true)
assert.strictEqual(registry.registerGame({ id, name: '重复游戏' }), false)
assert.strictEqual(registry.setGameFactory(id, () => createGameSession({ draw() {}, controller: { onTouchStart() {}, onTouchEnd() {} }, enter() { entered = true }, destroy() { destroyed = true } })), true)
assert.ok(registry.createGame(id))
const definition = registry.getGame(id)
const session = definition.create()
session.enter()
assert.strictEqual(entered, true)
assert.strictEqual(typeof session.draw, 'function')
assert.strictEqual(typeof session.onTouchStart, 'function')
assert.strictEqual(typeof session.onTouchEnd, 'function')
assert.strictEqual(typeof session.destroy, 'function')
session.destroy()
assert.strictEqual(destroyed, true)

console.log('app registry tests passed')
