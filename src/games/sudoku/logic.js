const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const FULL_MASK = 1022

const UNITS = [
  ...DIGITS.map((_, row) => DIGITS.map((__, col) => row * 9 + col)),
  ...DIGITS.map((_, col) => DIGITS.map((__, row) => row * 9 + col)),
  ...DIGITS.map((_, box) => DIGITS.map((__, i) => Math.floor(box / 3) * 27 + (box % 3) * 3 + Math.floor(i / 3) * 9 + i % 3))
]
const PEERS = Array.from({ length: 81 }, (_, index) => [...new Set(UNITS.filter(unit => unit.includes(index)).flat())].filter(peer => peer !== index))

function candidates(board, index) {
  if (board[index]) return 0
  return PEERS[index].reduce((mask, peer) => mask & ~(1 << board[peer]), FULL_MASK)
}

function availableCandidates(board, index, exclusions = []) {
  return candidates(board, index) & ~(exclusions[index] || 0)
}

function conflicts(board) {
  return new Set(board.flatMap((value, index) => value && PEERS[index].some(peer => board[peer] === value) ? [index] : []))
}

function completedUnits(board) {
  return UNITS.flatMap((unit, index) => unit.every(cell => board[cell] > 0) && new Set(unit.map(cell => board[cell])).size === 9 ? [index] : [])
}

function completedDigits(board) {
  return DIGITS.filter(digit => UNITS.every(unit => unit.filter(index => board[index] === digit).length === 1))
}

function countSolutions(input, limit = 2) {
  if (conflicts(input).size) return 0
  const board = [...input]
  let count = 0
  function visit() {
    if (count >= limit) return
    let chosen = -1
    let mask = 0
    let minimum = 10
    for (let index = 0; index < 81; index += 1) if (!board[index]) {
      const nextMask = candidates(board, index)
      const size = DIGITS.filter(digit => nextMask & (1 << digit)).length
      if (!size) return
      if (size < minimum) { chosen = index; mask = nextMask; minimum = size; if (size === 1) break }
    }
    if (chosen < 0) { count += 1; return }
    for (const digit of DIGITS) if (mask & (1 << digit)) {
      board[chosen] = digit
      visit()
      board[chosen] = 0
      if (count >= limit) return
    }
  }
  visit()
  return count
}

function solvePuzzle(input) {
  if (!Array.isArray(input) || input.length !== 81 || input.some(value => !Number.isInteger(value) || value < 0 || value > 9) || conflicts(input).size) return null
  const board = [...input]
  function visit() {
    let chosen = -1
    let mask = 0
    let minimum = 10
    for (let index = 0; index < 81; index += 1) if (!board[index]) {
      const nextMask = candidates(board, index)
      const size = DIGITS.filter(digit => nextMask & (1 << digit)).length
      if (!size) return false
      if (size < minimum) { chosen = index; mask = nextMask; minimum = size; if (size === 1) break }
    }
    if (chosen < 0) return true
    for (const digit of DIGITS) if (mask & (1 << digit)) {
      board[chosen] = digit
      if (visit()) return true
      board[chosen] = 0
    }
    return false
  }
  return visit() ? board : null
}

const INITIAL_PUZZLE = '530678000600195000098000060800060003400803001700020006060000280000419005000080079'.split('').map(Number)

const DIFFICULTY_CLUES = [45, 39, 34, 30, 26]

function shuffle(items) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}

function generatePuzzle(difficultyIndex = 1) {
  const target = DIFFICULTY_CLUES[Math.max(0, Math.min(DIFFICULTY_CLUES.length - 1, difficultyIndex))]
  let best = null
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const groups = shuffle([0, 1, 2])
    const rows = groups.flatMap(group => shuffle([0, 1, 2]).map(row => group * 3 + row))
    const cols = groups.flatMap(group => shuffle([0, 1, 2]).map(col => group * 3 + col))
    const digits = shuffle(DIGITS)
    const solution = rows.flatMap(row => cols.map(col => digits[(row * 3 + Math.floor(row / 3) + col) % 9]))
    const puzzle = [...solution]
    for (const index of shuffle(Array.from({ length: 81 }, (_, cell) => cell))) {
      const value = puzzle[index]
      puzzle[index] = 0
      if (countSolutions(puzzle) !== 1) puzzle[index] = value
      if (puzzle.filter(Boolean).length <= target) break
    }
    if (!best || puzzle.filter(Boolean).length < best.filter(Boolean).length) best = puzzle
    if (puzzle.filter(Boolean).length <= target) return puzzle
  }
  return best || [...INITIAL_PUZZLE]
}

function gameFromPuzzle(givens = INITIAL_PUZZLE) {
  return {
    givens: [...givens],
    values: [...givens],
    notes: Array(81).fill(0),
    exclusions: Array(81).fill(0),
    selected: null,
    filter: null,
    noteMode: false,
    history: [],
    won: false,
    celebrated: completedUnits(givens),
    celebratedDigits: completedDigits(givens),
    event: null,
    eventQueue: [],
    rewardSequence: 0
  }
}

function snapshot(state) {
  return { values: [...state.values], notes: [...state.notes], exclusions: [...state.exclusions], selected: state.selected, filter: state.filter, noteMode: state.noteMode }
}

function reducer(state, action) {
  if (action.type === 'select') {
    if (!Number.isInteger(action.index) || action.index < 0 || action.index > 80) return state
    return { ...state, selected: action.index, filter: state.values[action.index] ? null : state.filter }
  }
  if (action.type === 'filter') {
    return DIGITS.includes(action.digit) ? { ...state, selected: null, filter: state.filter === action.digit ? null : action.digit } : state
  }
  if (action.type === 'note-mode') return { ...state, noteMode: !state.noteMode }
  if (action.type === 'clear-event') {
    if (!state.event || (action.id !== undefined && action.id !== state.event.id)) return state
    const queue = state.eventQueue || []
    return { ...state, event: queue[0] || null, eventQueue: queue.slice(1) }
  }
  if (action.type === 'auto-notes') {
    if (state.won) return state
    const notes = [...state.notes]
    let changed = false
    for (let index = 0; index < 81; index += 1) if (!state.givens[index] && !state.values[index]) {
      const next = availableCandidates(state.values, index, state.exclusions)
      if (notes[index] !== next) { notes[index] = next; changed = true }
    }
    if (!changed) return state
    return { ...state, notes, history: [...state.history, snapshot(state)].slice(-200) }
  }
  if (action.type === 'undo') {
    const previous = state.history.at(-1)
    return previous ? { ...state, ...previous, history: state.history.slice(0, -1), won: false } : state
  }
  if (state.won) return state
  const index = action.index ?? state.selected
  if (!Number.isInteger(index) || index < 0 || index > 80 || state.givens[index]) return state
  const values = [...state.values]
  const notes = [...state.notes]
  const exclusions = [...state.exclusions]
  if (action.type === 'erase') { values[index] = 0; notes[index] = 0; exclusions[index] = 0 }
  if (action.type === 'exclude') {
    if (values[index] || !DIGITS.includes(action.digit) || !(candidates(values, index) & (1 << action.digit))) return state
    const mask = 1 << action.digit
    exclusions[index] ^= mask
    // A long-press on an orange candidate is the same exclusion action as
    // removing that candidate from notes. Keep both representations synced.
    if (exclusions[index] & mask) notes[index] &= ~mask
    else notes[index] |= mask
  }
  if (action.type === 'input' || action.type === 'note') {
    if (!DIGITS.includes(action.digit)) return state
    const mask = 1 << action.digit
    if (action.type === 'note') {
      if (values[index]) return state
      if (state.filter === action.digit && (candidates(values, index) & mask)) {
        exclusions[index] ^= mask
        if (exclusions[index] & mask) notes[index] &= ~mask
        else notes[index] |= mask
      } else {
        const removing = Boolean(notes[index] & mask)
        notes[index] ^= mask
        if (removing && (candidates(values, index) & mask)) exclusions[index] |= mask
        else if (!removing) exclusions[index] &= ~mask
      }
    } else {
      values[index] = action.digit
      notes[index] = 0
      exclusions[index] = 0
      PEERS[index].forEach(peer => { notes[peer] &= ~mask })
    }
  }
  const changed = values.some((value, i) => value !== state.values[i]) || notes.some((value, i) => value !== state.notes[i]) || exclusions.some((value, i) => value !== state.exclusions[i])
  if (!changed) return state
  const completed = completedUnits(values)
  const before = completedUnits(state.values)
  const celebrated = state.celebrated || []
  const freshUnits = completed.filter(unit => !before.includes(unit) && !celebrated.includes(unit))
  const digits = completedDigits(values)
  const beforeDigits = completedDigits(state.values)
  const celebratedDigits = state.celebratedDigits || []
  const freshDigits = digits.filter(digit => !beforeDigits.includes(digit) && !celebratedDigits.includes(digit))
  const won = completed.length === 27
  let rewardSequence = state.rewardSequence || 0
  const rewards = []
  if (freshUnits.length || freshDigits.length) rewards.push({ id: ++rewardSequence, units: freshUnits, digits: freshDigits, digitCells: values.flatMap((value, cell) => freshDigits.includes(value) ? [cell] : []), win: false })
  if (won) rewards.push({ id: ++rewardSequence, units: [], digits: [], digitCells: [], win: true })
  const pending = [...(state.eventQueue || []), ...rewards]
  const event = state.event || pending.shift() || null
  return { ...state, values, notes, exclusions, history: [...state.history, snapshot(state)].slice(-200), selected: action.type === 'exclude' ? state.selected : index, won, celebrated: [...new Set([...celebrated, ...completed])], celebratedDigits: [...new Set([...celebratedDigits, ...digits])], event, eventQueue: pending, rewardSequence }
}

module.exports = { DIGITS, FULL_MASK, UNITS, PEERS, INITIAL_PUZZLE, DIFFICULTY_CLUES, candidates, availableCandidates, conflicts, completedUnits, completedDigits, countSolutions, solvePuzzle, generatePuzzle, gameFromPuzzle, reducer }
