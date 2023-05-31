const socketUrl = 'ws://localhost:8080'
const ws = new WebSocket(socketUrl)

let clientId
let gameId
let playerColor

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
      clientId,
    })
  )
}

joinGameButton.onclick = () => {
  if (!gameId) gameId = inputGameId.value
  ws.send(
    JSON.stringify({
      method: 'join',
      clientId,
      gameId,
    })
  )
}

// incoming ws messages
ws.onmessage = message => {
  const response = JSON.parse(message.data)

  if (response.method === 'connect') {
    clientId = response.clientId
    console.log('Connection successful, your client ID is: ' + clientId)
  }

  if (response.method === 'create') {
    gameId = response.game.id
    console.log(
      'Created new game successfully, your game ID is: ' + response.game.id
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

      if (c.clientId === clientId) playerColor = c.color
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
        cell.style.background = playerColor
        ws.send(
          JSON.stringify({
            method: 'play',
            clientId,
            gameId,
            cellId: cell.tag,
            color: playerColor,
          })
        )
      }
      board.appendChild(cell)
    }
  }

  if (response.method === 'update') {
    for (let cell of Object.keys(response.game.state)) {
      const color = response.game.state[cell]
      const cellObject = document.getElementById('cell' + cell)
      cellObject.style.backgroundColor = color
    }
  }
}
