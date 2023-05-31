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

// grabbing elements
const createNewGameButton = document.getElementById('createNewGameButton')
const joinGameButton = document.getElementById('joinGameButton')
const inputGameId = document.getElementById('inputGameId')
const playersContainer = document.getElementById('playersContainer')
const board = document.getElementById('board')

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
    client.setMyClientId(response.clientId)
    console.log(
      'Connection successful, your client ID is: ' + client.getMyClientId()
    )
  }

  if (response.method === 'create') {
    client.setMyGameId(response.game.id)
    console.log(
      'Created new game successfully, your game ID is: ' + client.getMyGameId()
    )
  }

  if (response.method === 'join') {
    const game = response.game
    while (playersContainer.firstChild)
      playersContainer.removeChild(playersContainer.firstChild)

    game.clients.forEach(c => {
      const player = document.createElement('div')
      player.style.background = c.color
      player.textContent = c.clientId
      playersContainer.appendChild(player)

      if (c.clientId === client.getMyClientId()) client.setMyColor(c.color)
    })

    while (board.firstChild) board.removeChild(board.firstChild)

    for (let i = 0; i < game.cells; i++) {
      const cell = document.createElement('button')
      cell.id = 'cell' + (i + 1)
      cell.tag = i + 1
      cell.textContent = i + 1
      cell.style.width = '50px'
      cell.style.height = '50px'
      cell.onclick = () => {
        cell.style.background = client.getMyColor()
        ws.send(
          JSON.stringify({
            method: 'play',
            clientId: client.getMyClientId(),
            gameId: client.getMyGameId(),
            cellId: cell.tag,
            color: client.getMyColor(),
          })
        )
      }
      board.appendChild(cell)
    }
  }

  if (response.method === 'update') {
    for (let cellId of Object.keys(response.game.state)) {
      const cellColor = response.game.state[cellId]
      const cellObject = document.getElementById('cell' + cellId)
      cellObject.style.backgroundColor = cellColor
    }
  }
}
