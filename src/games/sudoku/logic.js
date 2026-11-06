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
    won: false
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
    exclusions[index] ^= 1 << action.digit
    if (exclusions[index] & (1 << action.digit)) notes[index] &= ~(1 << action.digit)
    else notes[index] |= 1 << action.digit
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
        notes[index] ^= mask
        if (notes[index] & mask) exclusions[index] &= ~mask
        else exclusions[index] |= mask
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
  return { ...state, values, notes, exclusions, history: [...state.history, snapshot(state)].slice(-200), selected: action.type === 'exclude' ? state.selected : index, won: completedUnits(values).length === 27 }
}

module.exports = { DIGITS, FULL_MASK, UNITS, PEERS, INITIAL_PUZZLE, candidates, availableCandidates, conflicts, completedUnits, countSolutions, solvePuzzle, gameFromPuzzle, reducer }
