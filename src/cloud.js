import { validateData } from './data.js'

const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const sessionKey = 'budsync-v3-session'
let refreshPromise = null

export const cloudReady = Boolean(url && key)

async function request(path, { method = 'GET', body, token } = {}) {
  if (!cloudReady) throw new Error('Cloud sync is not configured.')
  const response = await fetch(url + path, {
    method,
    headers: {
      apikey: key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const content = await response.json().catch(() => null)
  if (!response.ok) throw new Error(content?.msg || content?.error_description || content?.message || `Cloud request failed (${response.status}).`)
  return content
}

export function readSession() {
  try { return JSON.parse(localStorage.getItem(sessionKey)) } catch { return null }
}

function saveSession(session) {
  const saved = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + session.expires_in,
    user: { id: session.user.id, email: session.user.email },
  }
  localStorage.setItem(sessionKey, JSON.stringify(saved))
  return saved
}

export async function signIn(email, password) {
  return saveSession(await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } }))
}

export async function signUp(email, password) {
  const result = await request('/auth/v1/signup', { method: 'POST', body: { email, password } })
  return result.access_token ? saveSession(result) : null
}

async function refresh() {
  const current = readSession()
  if (!current?.refresh_token) throw new Error('Sign in again to continue syncing.')
  const rotate = async () => {
    const latest = readSession()
    if (latest?.refresh_token !== current.refresh_token && latest?.expires_at > Date.now() / 1000 + 60) return latest
    return saveSession(await request('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', body: { refresh_token: latest.refresh_token },
    }))
  }
  return navigator.locks ? navigator.locks.request('budsync-auth-refresh', rotate) : rotate()
}

export async function validSession() {
  let session = readSession()
  if (!session) return null
  if (session.expires_at <= Date.now() / 1000 + 60) {
    refreshPromise ||= refresh().finally(() => { refreshPromise = null })
    session = await refreshPromise
  }
  const user = await request('/auth/v1/user', { token: session.access_token })
  if (user.id !== session.user.id) throw new Error('Account identity changed. Sign in again.')
  return session
}

export async function signOut() {
  const session = readSession()
  localStorage.removeItem(sessionKey)
  if (session && navigator.onLine) {
    await request('/auth/v1/logout', { method: 'POST', token: session.access_token }).catch(() => {})
  }
}

export async function fetchSnapshot() {
  const session = await validSession()
  const rows = await request('/rest/v1/budsync_sync?select=revision,payload&limit=1', { token: session.access_token })
  const row = rows[0]
  return row ? { revision: Number(row.revision), data: validateData(row.payload) } : null
}

export async function applySnapshot(revision, data) {
  const session = await validSession()
  const result = await request('/rest/v1/rpc/budsync_apply_snapshot', {
    method: 'POST', token: session.access_token,
    body: { expected_revision: revision, next_payload: data },
  })
  return { applied: result.applied, revision: Number(result.revision), data: validateData(result.payload) }
}
