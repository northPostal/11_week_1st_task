/* eslint-disable import/no-duplicates */
import express from 'express'
import path from 'path'
import axios from 'axios'
import cors from 'cors'
import bodyParser from 'body-parser'
import sockjs from 'sockjs'

import cookieParser from 'cookie-parser'
import Html from '../client/html'

const { readFile, writeFile, unlink } = require('fs').promises

const setHeaders = (req, res, next) => {
  res.set('x-skillcrucial-user', '46a02278-f502-4416-a401-707cfef5cc86')
  res.set('Access-Control-Expose-Headers', 'X-SKILLCRUCIAL-USER')
  next()
}

const saveFile = async (users) => {
  return writeFile(`${__dirname}/test.json`, JSON.stringify(users), { encoding: 'utf8' })
}

const fileRead = async () => {
  return readFile(`${__dirname}/test.json`, { encoding: 'utf8' })
    .then((data) => JSON.parse(data))
    .catch(async () => {
      const { data: users } = await axios('https://jsonplaceholder.typicode.com/users')
      await saveFile(users)
      return users
    })
}

let connections = []

const port = process.env.PORT || 3000
const server = express()

server.use(setHeaders)

server.use(cors())

server.use(express.static(path.resolve(__dirname, '../dist/assets')))
server.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }))
server.use(bodyParser.json({ limit: '50mb', extended: true }))

server.use(cookieParser())

server.get('/api/v1/users/', async (req, res) => {
  const users = await fileRead()
  res.json(users)
}) // read

server.post('/api/v1/users/', async (req, res) => {
  const users = await fileRead()
  const newUserBody = req.body
  const userLength = users[users.length - 1].id
  newUserBody.id = userLength + 1
  const newUser = [...users, newUserBody]
  saveFile(newUser)
  res.json({ status: 'success', id: newUserBody.id })
}) // read & write

server.patch('/api/v1/users/:userId', async (req, res) => {
  const users = await fileRead()
  const { userId } = req.params
  const newUserBody = req.body
  const newUserArray = users.map((it) => (it.id === +userId ? Object.assign(it, newUserBody) : it))
  saveFile(newUserArray)
  res.json({ status: 'success', id: userId })
}) // read & write

server.delete('/api/v1/users/:userId', async (req, res) => {
  const users = await fileRead()
  const { userId } = req.params
  users.splice(Number(userId) - 1, 1)
  saveFile(users)
  res.json({ status: 'success', id: Number(userId) })
}) // read & write

server.delete('/api/v1/users/', async (req, res) => {
  unlink(`${__dirname}/test.json`)
  res.json()
}) // write

server.use('/api/', (req, res) => {
  res.status(404)
  res.end()
})

const echo = sockjs.createServer()
echo.on('connection', (conn) => {
  connections.push(conn)
  conn.on('data', async () => {})

  conn.on('close', () => {
    connections = connections.filter((c) => c.readyState !== 3)
  })
})

server.get('/', (req, res) => {
  // const body = renderToString(<Root />);
  const title = 'Server side Rendering'
  res.send(
    Html({
      body: '',
      title
    })
  )
})

server.get('/*', (req, res) => {
  const initialState = {
    location: req.url
  }

  return res.send(
    Html({
      body: '',
      initialState
    })
  )
})

const app = server.listen(port)

echo.installHandlers(app, { prefix: '/ws' })

// eslint-disable-next-line no-console
console.log(`Serving at http://localhost:${port}`)

// That's fucking awesome!
