import { validateData } from './data.js'

export function encodeSnapshot(data) {
  const payload = JSON.stringify(data)
  if (new TextEncoder().encode(payload).length > 9_500_000) {
    throw new Error('This workspace is too large for one Firebase sync. Download a JSON backup and reduce older entries before syncing.')
  }
  return payload
}

export function decodeSnapshot(value) {
  if (!value) return null
  return { revision: Number(value.revision), data: validateData(JSON.parse(value.payload)) }
}

export function nextSnapshot(current, revision, payload) {
  // Firebase may call the updater with an uncached null before loading existing server data.
  // Propose the first revision so the server can supply its value and retry the updater.
  if (current === null) return { revision: 1, payload }
  const actual = Number(current?.revision || 0)
  return actual === revision ? { revision: actual + 1, payload } : undefined
}
