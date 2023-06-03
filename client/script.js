const SERVER_PORT = 8080
const HOST = 'reactive-mol.onrender.com'

const socketUrl = 'ws://' + HOST + ':' + SERVER_PORT
const ws = new WebSocket(socketUrl)

class Client {
  #clientId
  #gameId
  #color

  constructor() {}

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
const gameIdContainer = document.getElementById('gameIdContainer')

// send ws messages based on events
createNewGameButton.onclick = () => {
  ws.send(
    JSON.stringify({
      method: 'create',
      clientId: client.getMyClientId(),
    })
  )
}

function displayGameId() {
  gameIdContainer.style.margin = '10px'
  gameIdContainer.textContent = 'Game ID: ' + client.getMyGameId()
}

joinGameButton.onclick = () => {
  if (!inputGameId.value) {
    return alert('Please enter game ID')
  }
  client.setMyGameId(inputGameId.value)
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
    client.setMyClientId(response.clientId)
    console.log(
      'Connection successful, your client ID is: ' + client.getMyClientId()
    )
  }

  if (response.method === 'create') {
    client.setMyGameId(response.game.id)
    displayGameId()
  }

  if (response.method === 'join') {
    displayGameId()
    const game = response.game
    myGame.setMyGame(game)
    while (playersContainer.firstChild)
      playersContainer.removeChild(playersContainer.firstChild)

    game.clients.forEach(c => {
      const playerWrapper = document.createElement('div')
      const label = document.createElement('span')
      label.textContent =
        c.clientId === client.getMyClientId() ? 'You: ' : 'They: '
      const player = document.createElement('span')
      player.style.width = '15px'
      player.style.height = '15px'
      player.style.background = c.color
      player.style.display = 'inline-block'
      player.style.border = '2px solid white'
      player.id = 'client-' + c.clientId
      playerWrapper.appendChild(label)
      playerWrapper.appendChild(player)

      playerWrapper.style.margin = '10px'
      playersContainer.appendChild(playerWrapper)

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
    const game = response.game
    myGame.setMyGame(game)
    game.clients.forEach(c => {
      if (c.clientId === game.nextMoveId) {
        const elem = document.getElementById('client-' + game.nextMoveId)
        elem.style.border = '2px solid black'
      } else {
        const elem = document.getElementById('client-' + c.clientId)
        elem.style.border = '2px solid white'
      }
    })
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
