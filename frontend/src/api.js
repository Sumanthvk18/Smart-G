export class AuthError extends Error {}

// All calls go to /api on the same origin: Vite proxies it in dev, Netlify in production.
export async function api(path, body = {}) {
  let res
  try {
    res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    })
  } catch {
    return { status: 'failed', code: 'network_error' }
  }
  let json
  try {
    json = await res.json()
  } catch {
    json = { status: 'failed', code: 'server_error' }
  }
  if (res.status === 401 && json.code === 'session_expired') throw new AuthError(json.message)
  return json
}

// Render's free plan sleeps when idle; keep pinging /health until it answers.
export async function waitForServer({ attempts = 25, delayMs = 3000 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch('/api/health', { signal: controller.signal, cache: 'no-store' })
      if (res.ok) return true
    } catch {
      /* still waking up */
    } finally {
      clearTimeout(timer)
    }
    await new Promise((r) => setTimeout(r, delayMs))
  }
  return false
}

// The phone pre-fills the last meter number used on it.
const METER_KEY = 'sg_last_meter'

export function getLastMeter() {
  try {
    return localStorage.getItem(METER_KEY) || ''
  } catch {
    return ''
  }
}

export function saveLastMeter(meterNo) {
  try {
    localStorage.setItem(METER_KEY, meterNo)
  } catch {
    /* private mode: the field just starts empty next time */
  }
}
