import app from './app.js'
import { initDatabase } from './database.js'
import { seedData } from './seed.js'
import { notificationService } from './notification.js'

initDatabase()
seedData()

const PORT = process.env.PORT || 3001

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
})

notificationService.init(server)

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0)
  })
})

export default app
