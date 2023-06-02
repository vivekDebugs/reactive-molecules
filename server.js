const http = require('http')
const websocket = require('websocket')
const express = require('express')
const { guid } = require('./utils')

class Board {
  #board = []
  length = 10

  constructor() {
    for (let i = 0; i < this.length; i++) {
      const row = []
      for (let j = 0; j < this.length; j++) {
        row.push(null)
      }
      this.#board.push(row)
    }
  }

  getBoard() {
    return this.#board
  }
}

const board = new Board()

class GameHub {
  #clients = {}
  #gameRooms = {}
  #colors = ['red', 'green', 'yellow']
  maxPlayers = 2

  constructor() {
    console.log('New GameHub initialized')
  }

  getClient(clientId) {
    return this.#clients[clientId]
  }

  addClient(clientId, connection) {
    this.#clients[clientId] = { connection }
  }

  getGameRoom(gameId) {
    return this.#gameRooms[gameId]
  }

  addNewGameRoom(gameId, game) {
    this.#gameRooms[gameId] = game
  }

  setGameState(gameId, cellCoords, cellData, clientId) {
    const [i, j] = cellCoords
    const { color } = cellData
    const game = this.#gameRooms[gameId]
    game.nextMoveId = this.#getNextMoveId(clientId, game.clients)
    game.board[i][j] = { color }
  }

  #getNextMoveId(clientId, clients = []) {
    const idxOfCurrentClient = clients.findIndex(c => c.clientId === clientId)
    const nextMoveIdx = (idxOfCurrentClient + 1) % clients.length
    return clients[nextMoveIdx].clientId
  }

  getAllColors() {
    return this.#colors
  }
}

const gameHub = new GameHub()

// client hosting
const app = express()
const CLIENT_PORT = 3000
app.use(express.static(__dirname + '/client'))
app.get('/', (req, res) => res.sendFile(__dirname + '/client/index.html'))
app.listen(CLIENT_PORT, () =>
  console.log('Client listening on port ' + CLIENT_PORT)
)

// server hosting
const httpServer = http.createServer()
const SERVER_PORT = 8080
httpServer.listen(SERVER_PORT, () =>
  console.log('Server listening on port ' + SERVER_PORT)
)

const WebSocketServer = websocket.server
const ws = new WebSocketServer({ httpServer })

ws.on('request', request => {
  const connection = request.accept(null, request.origin)

  connection.on('open', () => console.log('Connection established'))
  connection.on('close', () => console.log('Connection closed'))

  connection.on('message', message => {
    const response = JSON.parse(message.utf8Data)

    if (response.method === 'create') {
      const clientId = response.clientId
      const gameId = guid()
      const newBoard = new Board()
      const newGame = {
        id: gameId,
        clients: [],
        board: newBoard.getBoard(),
        nextMoveId: '',
      }
      gameHub.addNewGameRoom(gameId, newGame)
      gameHub.getClient(clientId).connection.send(
        JSON.stringify({
          method: 'create',
          game: newGame,
        })
      )
    }

    if (response.method === 'join') {
      const clientId = response.clientId
      const gameId = response.gameId
      const game = gameHub.getGameRoom(gameId)
      if (game.clients.length >= gameHub.maxPlayers) {
        console.log('Maxed palyers reached')
        return
      }
      const color = gameHub.getAllColors()[game.clients.length]
      game.clients.push({
        clientId,
        color,
      })

      game.clients.forEach(c => {
        gameHub.getClient(c.clientId).connection.send(
          JSON.stringify({
            method: 'join',
            game,
          })
        )
      })
    }

    if (response.method === 'play') {
      const { clientId, gameId, cellCoords, cellData } = response
      gameHub.setGameState(gameId, cellCoords, cellData, clientId)
      updateGameState(gameHub.getGameRoom(gameId))
    }
  })

  const clientId = guid()
  gameHub.addClient(clientId, connection)

  connection.send(
    JSON.stringify({
      method: 'connect',
      clientId,
    })
  )
})

const updateGameState = game => {
  game.clients.forEach(c => {
    gameHub.getClient(c.clientId).connection.send(
      JSON.stringify({
        method: 'update',
        game,
      })
    )
  })
}
