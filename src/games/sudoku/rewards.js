const POINTS = [100, 130, 160, 200, 240]
const SEARCH_WINS = 3
const NOTE_WINS = 5
const STORAGE_KEY = 'sudoku.rewards.v1'

function createRewards(storage) {
  const saved = storage.getStorageSync(STORAGE_KEY) || {}
  const completed = new Set(Array.isArray(saved.completed) ? saved.completed : [])
  let points = Number.isSafeInteger(saved.points) && saved.points >= 0 ? saved.points : 0
  let wins = 0
  let notes = 0
  let pendingSave = false

  function save() {
    if (!pendingSave) return
    try {
      storage.setStorageSync(STORAGE_KEY, { points, completed: [...completed] })
      pendingSave = false
    } catch (error) {
      console.warn('数独积分暂未保存', error)
    }
  }

  return {
    get searchReady() { return wins >= SEARCH_WINS },
    get searchRemaining() { return Math.max(0, SEARCH_WINS - wins) },
    get notesRemaining() { return notes },
    get noteWinsRemaining() { return Math.max(0, NOTE_WINS - wins) },
    save,
    complete(givens, difficulty) {
      const key = givens.join('')
      let earned = 0
      let message = '本题已获积分'
      if (!completed.has(key)) {
        completed.add(key)
        earned = POINTS[difficulty]
        points += earned
        wins += 1
        if (wins === NOTE_WINS) notes += 2
        if (wins < SEARCH_WINS) message = `再完成 ${SEARCH_WINS - wins} 局可寻找数字`
        else if (wins === SEARCH_WINS) message = '寻找数字已解锁 · 本次游玩有效'
        else if (wins < NOTE_WINS) message = `再完成 ${NOTE_WINS - wins} 局可获自动笔记`
        else if (wins === NOTE_WINS) message = '获得自动笔记 × 2 · 本次游玩有效'
        else message = `本次已完成 ${wins} 局`
        pendingSave = true
      }
      save()
      return { earned, points, message, at: Date.now() }
    },
    autoNotes(game, reducer) {
      if (notes === 0) return game
      const next = reducer(game, { type: 'auto-notes' })
      if (next !== game) notes -= 1
      return next
    }
  }
}

module.exports = { createRewards }
