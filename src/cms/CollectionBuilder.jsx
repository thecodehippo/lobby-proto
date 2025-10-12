import { useState, useEffect } from 'react'
import './GameSelector.css'

export default function CollectionBuilder({ isOpen, onClose, collection, onCollectionChange }) {
  const [rules, setRules] = useState([])
  const [autoAdd, setAutoAdd] = useState(false)
  const [matchingGames, setMatchingGames] = useState([])
  const [allGames, setAllGames] = useState([])

  useEffect(() => {
    if (collection) {
      setRules(collection.rules || [])
      setAutoAdd(collection.auto_add || false)
    }
  }, [collection])

  useEffect(() => {
    if (isOpen) {
      fetch('/api/games')
        .then(res => res.json())
        .then(data => setAllGames(data))
    }
  }, [isOpen])

  useEffect(() => {
    if (rules.length > 0 && allGames.length > 0) {
      const filtered = allGames.filter(game => evaluateRules(game, rules))
      setMatchingGames(filtered)
    } else {
      setMatchingGames([])
    }
  }, [rules, allGames])

  const addRule = () => {
    setRules([...rules, { field: 'studio', operator: '==', value: '', logic: 'AND' }])
  }

  const updateRule = (index, updates) => {
    const newRules = [...rules]
    newRules[index] = { ...newRules[index], ...updates }
    setRules(newRules)
  }

  const removeRule = (index) => {
    setRules(rules.filter((_, i) => i !== index))
  }

  const save = () => {
    onCollectionChange({
      rules,
      auto_add: autoAdd,
      matching_count: matchingGames.length
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Collection Builder</h3>
          <button onClick={onClose}>×</button>
        </div>
        
        <div style={{ padding: '16px 20px' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={autoAdd}
                onChange={e => setAutoAdd(e.target.checked)}
              />
              Automatically add new games that match criteria
            </label>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>Filter Rules</h4>
              <button onClick={addRule} style={{ padding: '4px 8px', fontSize: 12 }}>
                Add Rule
              </button>
            </div>
            
            {rules.map((rule, index) => (
              <RuleRow
                key={index}
                rule={rule}
                index={index}
                showLogic={index > 0}
                onUpdate={updateRule}
                onRemove={removeRule}
              />
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4>Matching Games ({matchingGames.length})</h4>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
              {matchingGames.map(game => (
                <div key={game.gameid} style={{ padding: 8, borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                  <div style={{ fontWeight: 600 }}>{game.gamename}</div>
                  <div style={{ color: '#6b7280' }}>
                    {game.gameid} • {game.studio} • {game.gametype} • {game.features}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <span>{matchingGames.length} games match criteria</span>
          <button onClick={save}>Save Collection</button>
        </div>
      </div>
    </div>
  )
}

function RuleRow({ rule, index, showLogic, onUpdate, onRemove }) {
  const fields = [
    { value: 'gamename', label: 'Game Name' },
    { value: 'gametype', label: 'Game Type' },
    { value: 'studio', label: 'Provider/Supplier' },
    { value: 'features', label: 'Features' },
    { value: 'volatility', label: 'Volatility' },
    { value: 'rtp', label: 'RTP' },
    { value: 'minbet', label: 'Min Bet' },
    { value: 'maxbet', label: 'Max Bet' }
  ]

  const operators = [
    { value: '==', label: 'equals' },
    { value: '!=', label: 'not equals' },
    { value: 'contains', label: 'contains' },
    { value: '>', label: 'greater than' },
    { value: '<', label: 'less than' }
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }}>
      {showLogic && (
        <select
          value={rule.logic}
          onChange={e => onUpdate(index, { logic: e.target.value })}
          style={{ width: 60, padding: 4, fontSize: 12 }}
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
      )}
      
      <select
        value={rule.field}
        onChange={e => onUpdate(index, { field: e.target.value })}
        style={{ flex: 1, padding: 4, fontSize: 12 }}
      >
        {fields.map(field => (
          <option key={field.value} value={field.value}>{field.label}</option>
        ))}
      </select>

      <select
        value={rule.operator}
        onChange={e => onUpdate(index, { operator: e.target.value })}
        style={{ width: 100, padding: 4, fontSize: 12 }}
      >
        {operators.map(op => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      <input
        type="text"
        value={rule.value}
        onChange={e => onUpdate(index, { value: e.target.value })}
        placeholder="Value"
        style={{ flex: 1, padding: 4, fontSize: 12 }}
      />

      <button
        onClick={() => onRemove(index)}
        style={{ padding: '2px 6px', fontSize: 12, color: '#ef4444' }}
      >
        ×
      </button>
    </div>
  )
}

function evaluateRules(game, rules) {
  if (rules.length === 0) return true

  let result = evaluateRule(game, rules[0])
  
  for (let i = 1; i < rules.length; i++) {
    const ruleResult = evaluateRule(game, rules[i])
    if (rules[i].logic === 'AND') {
      result = result && ruleResult
    } else {
      result = result || ruleResult
    }
  }
  
  return result
}

function evaluateRule(game, rule) {
  const gameValue = String(game[rule.field] || '').toLowerCase()
  const ruleValue = String(rule.value || '').toLowerCase()
  
  switch (rule.operator) {
    case '==':
      return gameValue === ruleValue
    case '!=':
      return gameValue !== ruleValue
    case 'contains':
      return gameValue.includes(ruleValue)
    case '>':
      return parseFloat(game[rule.field]) > parseFloat(rule.value)
    case '<':
      return parseFloat(game[rule.field]) < parseFloat(rule.value)
    default:
      return false
  }
}