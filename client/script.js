const socketUrl = 'ws://localhost:8080'
const ws = new WebSocket(socketUrl)

class Client {
  #clientId
  #gameId
  #color

  constructor() {
    console.log('New Client initialized')
  }

  getMyClientId() {
    return this.#clientId
  }

  setMyClientId(clientId) {
    this.#clientId = clientId
  }

  getMyGameId() {
    return this.#gameId
  }

  setMyGameId(gameId) {
    this.#gameId = gameId
  }

  getMyColor() {
    return this.#color
  }

  setMyColor(color) {
    this.#color = color
  }
}

const client = new Client()

class Game {
  #game = {}
  constructor(game = {}) {
    this.#game = game
  }
  getMyGame() {
    return this.#game
  }
  setMyGame(game) {
    this.#game = game
  }
  getCellMetadata([i, j]) {
    return this.#game.board[i][j]
  }
}

const myGame = new Game()

// grabbing elements
const createNewGameButton = document.getElementById('createNewGameButton')
const joinGameButton = document.getElementById('joinGameButton')
const inputGameId = document.getElementById('inputGameId')
const playersContainer = document.getElementById('playersContainer')
const boardContainer = document.getElementById('board')

// send ws messages based on events
createNewGameButton.onclick = () => {
  ws.send(
    JSON.stringify({
      method: 'create',
      clientId: client.getMyClientId(),
    })
  )
}

joinGameButton.onclick = () => {
  if (!client.getMyGameId()) client.setMyGameId(inputGameId.value)
  ws.send(
    JSON.stringify({
      method: 'join',
      clientId: client.getMyClientId(),
      gameId: client.getMyGameId(),
    })
  )
}

// incoming ws messages
ws.onmessage = message => {
  const response = JSON.parse(message.data)

  if (response.method === 'connect') {
    console.log(response)
    client.setMyClientId(response.clientId)
    console.log(
      'Connection successful, your client ID is: ' + client.getMyClientId()
    )
  }

  if (response.method === 'create') {
    console.log(response)
    client.setMyGameId(response.game.id)
    console.log(
      'Created new game successfully, your game ID is: ' + client.getMyGameId()
    )
  }

  if (response.method === 'join') {
    console.log(response)
    const game = response.game
    myGame.setMyGame(game)
    while (playersContainer.firstChild)
      playersContainer.removeChild(playersContainer.firstChild)

    game.clients.forEach(c => {
      const player = document.createElement('div')
      player.style.background = c.color
      player.textContent = c.clientId
      playersContainer.appendChild(player)

      if (c.clientId === client.getMyClientId()) client.setMyColor(c.color)
    })

    while (boardContainer.firstChild)
      boardContainer.removeChild(boardContainer.firstChild)

    for (let i = 0; i < game.board.length; i++) {
      const row = game.board[i]
      const boardRow = document.createElement('div')
      for (let j = 0; j < row.length; j++) {
        const { color, count } = row[j] || {}
        const cell = document.createElement('button')
        cell.style.width = '30px'
        cell.style.height = '30px'
        cell.id = 'cell-' + i + j
        cell.textContent = count
        cell.style.background = color
        boardRow.appendChild(cell)
        cell.onclick = () => {
          const { nextMoveId, isStart } = myGame.getMyGame()
          const { clientId: cellOwnerId } = myGame.getCellMetadata([i, j])
          if (
            isStart &&
            (!nextMoveId || nextMoveId === client.getMyClientId()) &&
            (!cellOwnerId || cellOwnerId === client.getMyClientId())
          ) {
            console.log('Clicked on cell with coordinates: ', i, j)
            ws.send(
              JSON.stringify({
                method: 'play',
                clientId: client.getMyClientId(),
                gameId: client.getMyGameId(),
                cellCoords: [i, j],
              })
            )
          }
        }
      }
      boardContainer.appendChild(boardRow)
    }
  }

  if (response.method === 'update') {
    console.log(response)
    const game = response.game
    myGame.setMyGame(game)
    for (let i = 0; i < game.board.length; i++) {
      const row = game.board[i]
      for (let j = 0; j < row.length; j++) {
        const { color, count } = row[j] || {}
        const cell = document.getElementById('cell-' + i + j)
        cell.style.background = count > 0 ? color : null
        cell.textContent = count
      }
    }
  }
}
