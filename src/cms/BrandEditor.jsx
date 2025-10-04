import React, { useMemo, useState, useEffect } from 'react'
import { useCms } from './CmsContext.jsx'

export default function BrandEditor() {
  const { selectedBrand, actions } = useCms()

  // Local form state, synced to context
  const [name, setName] = useState('')
  const [localesCSV, setLocalesCSV] = useState('')

  // Hydrate form when selection changes
  useEffect(() => {
    if (!selectedBrand) return
    setName(selectedBrand.name || '')
    setLocalesCSV((selectedBrand.locales || []).join(', '))
  }, [selectedBrand])

  const parsedLocales = useMemo(() => {
    return localesCSV
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  }, [localesCSV])

  if (!selectedBrand) {
    return (
      <section style={styles.empty}>
        <p>Select a brand from the left to edit its configuration.</p>
      </section>
    )
  }

  const save = () => {
    actions.updateBrand(selectedBrand.id, {
      name: name.trim() || selectedBrand.id,
      locales: parsedLocales,
    })
  }

  return (
    <section style={styles.section}>
      <h2 style={styles.h2}>Brand Configuration</h2>

      <div style={styles.field}>
        <label style={styles.label}>Brand name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. bwincom"
          style={styles.input}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Supported locales</label>
        <input
          value={localesCSV}
          onChange={(e) => setLocalesCSV(e.target.value)}
          placeholder="Comma-separated, e.g. en-GB, de-DE"
          style={styles.input}
        />
        <div style={styles.help}>
          Parsed: {parsedLocales.length ? parsedLocales.join(' • ') : '—'}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={save} style={styles.primaryBtn}>Save changes</button>
      </div>
    </section>
  )
}

const styles = {
  section: { padding: 24 },
  empty: { padding: 24, color: '#6b7280' },
  h2: { margin: 0, marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 },
  input: {
    width: 420,
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    outline: 'none',
  },
  help: { fontSize: 12, color: '#6b7280', marginTop: 6 },
  primaryBtn: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #111827',
    background: '#111827',
    color: 'white',
    cursor: 'pointer',
  },
}