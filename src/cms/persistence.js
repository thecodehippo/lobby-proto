const API_BASE = '/api' // same origin; Vite proxy optional

export async function loadCmsState() {
  const res = await fetch(`${API_BASE}/cms`)
  if (!res.ok) throw new Error('Failed to load CMS state')
  const data = await res.json()
  return data.state || { brands: [] }
}

export async function saveCmsState(state) {
  const res = await fetch(`${API_BASE}/cms`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  })
  if (!res.ok) throw new Error('Failed to save CMS state')
  const data = await res.json()
  return data.state
}

// simple debounce
export function debounce(fn, wait = 600) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), wait)
  }
}