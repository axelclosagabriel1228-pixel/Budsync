import { blankData, storageKey, validateData } from './data.js'

const dbName = 'budsync-v3'
const storeName = 'workspaces'

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(storeName)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Close other Budsync tabs and try again.'))
  })
}

async function access(key, value) {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, value === undefined ? 'readonly' : 'readwrite')
      const request = value === undefined
        ? transaction.objectStore(storeName).get(key)
        : transaction.objectStore(storeName).put(value, key)
      transaction.oncomplete = () => resolve(request.result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export const workspaceKey = (userId) => userId ? `user:${userId}` : 'guest'

export async function readWorkspace(key) {
  const saved = await access(key)
  if (saved) return { ...saved, data: validateData(saved.data) }
  if (key === 'guest') {
    const legacy = localStorage.getItem(storageKey)
    if (legacy) {
      const data = validateData(JSON.parse(legacy))
      const migrated = { data, revision: 0, dirty: false }
      await access(key, migrated)
      localStorage.removeItem(storageKey)
      return migrated
    }
  }
  return null
}

export async function readPreviousAccountWorkspace() {
  let previous
  try { previous = JSON.parse(localStorage.getItem('budsync-v3-session')) } catch { return null }
  if (!previous?.user?.id) return null
  const saved = await readWorkspace(workspaceKey(previous.user.id))
  return saved ? { email: previous.user.email || 'previous account', data: saved.data } : null
}

export const freshWorkspace = () => ({ data: blankData(), revision: 0, dirty: false })

export async function writeWorkspace(key, workspace) {
  await access(key, workspace)
}
