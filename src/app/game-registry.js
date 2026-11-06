const games = [
  {
    id: 'minesweeper',
    name: '扫雷',
    description: '找出所有地雷，保持冷静',
    icon: 'mine',
    status: 'available'
  },
  {
    id: 'sudoku',
    name: '数独',
    description: '用逻辑填满九宫格',
    icon: 'sudoku',
    status: 'available'
  }
]

function getGame(gameId) {
  return games.find(game => game.id === gameId) || null
}

function listGames() {
  return games.slice()
}

module.exports = { getGame, listGames }
