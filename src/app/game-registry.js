const games = [
  {
    id: 'minesweeper',
    name: '扫雷',
    description: '找出所有地雷，保持冷静',
    icon: 'mine',
    status: 'available', iconBackground: '#e8eff4', iconColor: '#657b8c', symbol: '✣'
  },
  {
    id: 'sudoku',
    name: '数独',
    description: '用逻辑填满九宫格',
    icon: 'sudoku',
    status: 'available', iconBackground: '#eef0ed', iconColor: '#788778', symbol: '9'
  }
]

function getGame(gameId) {
  return games.find(game => game.id === gameId) || null
}

function listGames() {
  return games.slice()
}

function registerGame(game) {
  if (!game || !game.id || games.some(item => item.id === game.id)) return false
  games.push({ ...game, status: game.status || 'available' })
  return true
}

function setGameFactory(gameId, factory) {
  const game = getGame(gameId)
  if (!game || typeof factory !== 'function') return false
  game.create = factory
  return true
}

module.exports = { getGame, listGames, registerGame, setGameFactory }
