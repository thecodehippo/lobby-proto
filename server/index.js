// server/index.js
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import pkg from 'pg'
import { fileURLToPath } from 'url'
import path from 'path'
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