const http = require('http')
const websocket = require('websocket')
const express = require('express')
const { guid } = require('./utils')

const clients = {}
const games = {}
const colors = ['red', 'green', 'yellow']

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
      games[gameId] = newGame
      const con = clients[clientId].connection
      con.send(
        JSON.stringify({
          method: 'create',
          game: newGame,
        })
      )
    }

    if (response.method === 'join') {
      const clientId = response.clientId
      const gameId = response.gameId
      const game = games[gameId]
      if (game.clients.length >= 2) {
        console.log('Maxed palyers reached')
        return
      }
      const color = colors[game.clients.length]
      game.clients.push({
        clientId,
        color,
      })

      if (game.clients.length === 2) updateGameState()

      game.clients.forEach(c => {
        clients[c.clientId].connection.send(
          JSON.stringify({
            method: 'join',
            game,
          })
        )
      })
    }

    if (response.method === 'play') {
      const clientId = response.clientId
      const gameId = response.gameId
      const cellId = response.cellId
      const color = response.color

      let gameState = games[gameId].state
      gameState[cellId] = color
      games[gameId].state = gameState
    }
  })

  const clientId = guid()
  clients[clientId] = { connection }

  connection.send(
    JSON.stringify({
      method: 'connect',
      clientId,
    })
  )
})

const updateGameState = () => {
  for (const g of Object.keys(games)) {
    const game = games[g]
    game.clients.forEach(c => {
      clients[c.clientId].connection.send(
        JSON.stringify({
          method: 'update',
          game,
        })
      )
    })
  }
  setTimeout(updateGameState, 500)
}
