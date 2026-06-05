import type { VercelRequest, VercelResponse } from '@vercel/node'
import app from './app.js'
import { initDatabase } from './database.js'
import { seedData } from './seed.js'

initDatabase()
seedData()

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res)
}
