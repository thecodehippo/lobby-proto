import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadLobbyData() {
  try {
    const lobbyDataPath = path.join(__dirname, '../mock/lobby_data.json')
    
    if (!fs.existsSync(lobbyDataPath)) {
      return { brands: [] }
    }
    
    return JSON.parse(fs.readFileSync(lobbyDataPath, 'utf8'))
  } catch (error) {
    console.error('Error loading lobby data:', error)
    return { brands: [] }
  }
}

export const lobbyData = loadLobbyData()