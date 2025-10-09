import { useState, useEffect } from 'react'
import './GameSelector.css'

export default function GameSelector({ isOpen, onClose, selectedGames, onGamesChange }) {
  const [games, setGames] = useState([])
  const [filteredGames, setFilteredGames] = useState([])
  const [searchName, setSearchName] = useState('')
  const [searchVariant, setSearchVariant] = useState('')
  const [searchSupplier, setSearchSupplier] = useState('')
  const [searchFeatures, setSearchFeatures] = useState('')
  const [filterType, setFilterType] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetch('/api/games')
        .then(res => res.json())
        .then(data => {
          setGames(data)
          setFilteredGames(data)
        })
    }
  }, [isOpen])

  useEffect(() => {
    let filtered = games.filter(game => {
      return (
        game.gamename.toLowerCase().includes(searchName.toLowerCase()) &&
        game.gameid.toLowerCase().includes(searchVariant.toLowerCase()) &&
        game.studio.toLowerCase().includes(searchSupplier.toLowerCase()) &&
        game.features.toLowerCase().includes(searchFeatures.toLowerCase()) &&
        (filterType === '' || game.gametype === filterType)
      )
    })
    setFilteredGames(filtered)
  }, [games, searchName, searchVariant, searchSupplier, searchFeatures, filterType])

  const toggleGame = (game) => {
    const isSelected = selectedGames.some(g => g.id === game.gameid)
    if (isSelected) {
      onGamesChange(selectedGames.filter(g => g.id !== game.gameid))
    } else {
      onGamesChange([...selectedGames, { id: game.gameid, name: game.gamename, supplier: game.studio }])
    }
  }

  const gameTypes = [...new Set(games.map(g => g.gametype))].sort()

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Select Games</h3>
          <button onClick={onClose}>×</button>
        </div>
        
        <div className="search-filters">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Search by variant..."
            value={searchVariant}
            onChange={e => setSearchVariant(e.target.value)}
          />
          <input
            type="text"
            placeholder="Search by supplier..."
            value={searchSupplier}
            onChange={e => setSearchSupplier(e.target.value)}
          />
          <input
            type="text"
            placeholder="Search by features..."
            value={searchFeatures}
            onChange={e => setSearchFeatures(e.target.value)}
          />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {gameTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="games-list">
          {filteredGames.map(game => {
            const isSelected = selectedGames.some(g => g.id === game.gameid)
            return (
              <div
                key={game.gameid}
                className={`game-item ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleGame(game)}
              >
                <div className="game-info">
                  <div className="game-name">{game.gamename}</div>
                  <div className="game-details">
                    {game.gameid} • {game.studio} • {game.gametype} • {game.features}
                  </div>
                </div>
                <div className="game-checkbox">
                  {isSelected ? '✓' : ''}
                </div>
              </div>
            )
          })}
        </div>

        <div className="modal-footer">
          <span>{selectedGames.length} games selected</span>
          <button onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}