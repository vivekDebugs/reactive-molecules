const http = require('http')
const websocket = require('websocket')
const express = require('express')
const { guid } = require('./utils')

class GameHub {
  #clients = {}
  #gameRooms = {}
  #colors = ['red', 'green', 'yellow']

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

  setGameState(gameId, cellId, color) {
    this.#gameRooms[gameId].state[cellId] = color
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
      const newGame = {
        id: gameId,
        cells: 20,
        clients: [],
        state: {},
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
      if (game.clients.length >= 2) {
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

      updateGameState(game)
    }

    if (response.method === 'play') {
      const clientId = response.clientId
      const gameId = response.gameId
      const cellId = response.cellId
      const color = response.color

      gameHub.setGameState(gameId, cellId, color)

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
