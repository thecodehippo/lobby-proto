// server/index.js
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import pkg from 'pg'
import { fileURLToPath } from 'url'
import path from 'path'
import { gameData } from './seed_games.js'
const { Pool } = pkg

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')))
}

const DATABASE_URL = process.env.DATABASE_URL
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL')
  process.exit(1)
}
console.log('[cms-api] Using DATABASE_URL:', DATABASE_URL)

const pool = new Pool({ connectionString: DATABASE_URL })

async function ensureTable() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS cms_state (
        id          INT PRIMARY KEY DEFAULT 1,
        state       JSONB NOT NULL,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_data (
        id SERIAL PRIMARY KEY,
        gameid VARCHAR(50) UNIQUE NOT NULL,
        gamename VARCHAR(255) NOT NULL,
        gametype VARCHAR(50) NOT NULL,
        rtp DECIMAL(5,2),
        volatility VARCHAR(20),
        studio VARCHAR(100),
        features TEXT,
        exclusive BOOLEAN DEFAULT FALSE,
        branded BOOLEAN DEFAULT FALSE,
        persistentstate BOOLEAN DEFAULT FALSE,
        reellayout VARCHAR(20),
        jackpot VARCHAR(20),
        searches INTEGER DEFAULT 0,
        theortp DECIMAL(5,2),
        currentsessions INTEGER DEFAULT 0,
        recentlaunches INTEGER DEFAULT 0,
        hitrate DECIMAL(5,2),
        themes TEXT,
        winlinetype VARCHAR(30),
        waystowin INTEGER,
        maxmultiplier INTEGER,
        minbet DECIMAL(10,2),
        maxbet DECIMAL(10,2),
        releasedate DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    // Seed game data if empty
    const { rows } = await client.query('SELECT COUNT(*) FROM game_data')
    if (rows[0].count === '0') {
      for (const game of gameData) {
        await client.query(`
          INSERT INTO game_data (gameid, gamename, gametype, rtp, volatility, studio, features, exclusive, branded, persistentstate, reellayout, jackpot, searches, theortp, currentsessions, recentlaunches, hitrate, themes, winlinetype, waystowin, maxmultiplier, minbet, maxbet, releasedate)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        `, [
          game.gameid, game.gamename, game.gametype, game.rtp, game.volatility, game.studio,
          game.features, game.exclusive, game.branded, game.persistentstate, game.reellayout,
          game.jackpot, game.searches, game.theortp, game.currentsessions, game.recentlaunches,
          game.hitrate, game.themes, game.winlinetype, game.waystowin, game.maxmultiplier,
          game.minbet, game.maxbet, game.releasedate
        ])
      }
    }
  } finally {
    client.release()
  }
}

async function getState(client) {
  const { rows } = await client.query('SELECT state, updated_at FROM cms_state WHERE id = 1')
  if (!rows.length) return { state: { brands: [] }, updated_at: null }
  return { state: rows[0].state, updated_at: rows[0].updated_at }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, deployed_via: 'github_actions' }))

app.get('/api/cms', async (_req, res) => {
  try {
    const client = await pool.connect()
    try {
      const data = await getState(client)
      res.json(data)
    } finally {
      client.release()
    }
  } catch (e) {
    console.error('GET /api/cms error:', e)
    res.status(500).json({ error: e.message || 'Failed to load CMS state' })
  }
})

app.put('/api/cms', async (req, res) => {
  try {
    const { state } = req.body
    if (!state || typeof state !== 'object') {
      return res.status(400).json({ error: 'Invalid state payload' })
    }
    const client = await pool.connect()
    try {
      await client.query(
        `INSERT INTO cms_state (id, state, updated_at)
         VALUES (1, $1, NOW())
         ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = EXCLUDED.updated_at`,
        [state]
      )
      const data = await getState(client)
      res.json(data)
    } finally {
      client.release()
    }
  } catch (e) {
    console.error('PUT /api/cms error:', e)
    res.status(500).json({ error: e.message || 'Failed to save CMS state' })
  }
})

app.get('/api/games', async (req, res) => {
  try {
    const client = await pool.connect()
    try {
      const { rows } = await client.query('SELECT * FROM game_data ORDER BY gamename')
      res.json(rows)
    } finally {
      client.release()
    }
  } catch (e) {
    console.error('GET /api/games error:', e)
    res.status(500).json({ error: e.message || 'Failed to load games' })
  }
})

// Catch-all handler for SPA in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'))
  })
}

ensureTable()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CMS API listening on http://localhost:${PORT}`)
    })
  })
  .catch((e) => {
    console.error('Failed to init DB/table:', e)
    process.exit(1)
  })