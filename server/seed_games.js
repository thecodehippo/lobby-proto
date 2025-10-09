import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Read and parse the game data from the import script output
function loadGameData() {
  try {
    // This will contain all 1027 games from the Excel file
    const gameDataPath = path.join(__dirname, '../mock/game_data.json')
    
    // If JSON doesn't exist, return minimal seed data
    if (!fs.existsSync(gameDataPath)) {
      return [
        {
          gameid: 'game_h8bk10ox',
          gamename: 'Crazy Empire Spins',
          gametype: 'Arcade',
          rtp: 94.55,
          volatility: 'Low',
          studio: 'Red Tiger',
          features: 'Sticky Wilds, Multipliers',
          exclusive: false,
          branded: false,
          persistentstate: false,
          reellayout: '4x5',
          jackpot: 'Progressive',
          searches: 6296,
          theortp: 93.36,
          currentsessions: 286,
          recentlaunches: 15,
          hitrate: 23.48,
          themes: 'Classic Slots',
          winlinetype: 'Adjustable',
          waystowin: 4054,
          maxmultiplier: 832,
          minbet: 0.47,
          maxbet: 48.29,
          releasedate: '2023-01-12'
        }
      ]
    }
    
    return JSON.parse(fs.readFileSync(gameDataPath, 'utf8'))
  } catch (error) {
    console.error('Error loading game data:', error)
    return []
  }
}

export const gameData = loadGameData()