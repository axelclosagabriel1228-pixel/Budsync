const databaseName = 'budsync-receipts-v1'
const foldersStore = 'folders'
const receiptsStore = 'receipts'
const deletesStore = 'driveDeletes'

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(foldersStore)) request.result.createObjectStore(foldersStore, { keyPath: 'key' })
      if (!request.result.objectStoreNames.contains(receiptsStore)) request.result.createObjectStore(receiptsStore, { keyPath: 'key' })
      if (!request.result.objectStoreNames.contains(deletesStore)) request.result.createObjectStore(deletesStore, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Close other Budsync tabs and try again.'))
  })
}

async function requestStore(name, mode, action) {
  const db = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(name, mode)
      const request = action(transaction.objectStore(name))
      transaction.oncomplete = () => resolve(request.result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

const keyFor = (scope, id) => `${scope}:${id}`

export async function listReceiptFolders(scope) {
  const items = await requestStore(foldersStore, 'readonly', (store) => store.getAll())
  return items.filter((item) => item.scope === scope)
}

export async function listReceipts(scope) {
  const items = await requestStore(receiptsStore, 'readonly', (store) => store.getAll())
  return items.filter((item) => item.scope === scope)
}

export async function putReceiptFolder(scope, folder) {
  await requestStore(foldersStore, 'readwrite', (store) => store.put({ ...folder, scope, key: keyFor(scope, folder.id) }))
}

export async function putReceipt(scope, receipt) {
  await requestStore(receiptsStore, 'readwrite', (store) => store.put({ ...receipt, scope, key: keyFor(scope, receipt.id) }))
}

export async function removeReceipt(scope, id, queueDriveDelete = true) {
  const db = await openDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([receiptsStore, deletesStore], 'readwrite')
      transaction.objectStore(receiptsStore).delete(keyFor(scope, id))
      if (queueDriveDelete) transaction.objectStore(deletesStore).put({ key: `${scope}:receipt:${id}`, scope, kind: 'receipt', id, deletedAt: new Date().toISOString() })
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export async function removeReceiptFolder(scope, id, receiptIds, queueDriveDelete = true) {
  const db = await openDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([foldersStore, receiptsStore, deletesStore], 'readwrite')
      transaction.objectStore(foldersStore).delete(keyFor(scope, id))
      for (const receiptId of receiptIds) transaction.objectStore(receiptsStore).delete(keyFor(scope, receiptId))
      if (queueDriveDelete) transaction.objectStore(deletesStore).put({ key: `${scope}:folder:${id}`, scope, kind: 'folder', id, deletedAt: new Date().toISOString() })
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export async function listDriveDeletes(scope) {
  const items = await requestStore(deletesStore, 'readonly', (store) => store.getAll())
  return items.filter((item) => item.scope === scope)
}

export async function clearDriveDelete(scope, kind, id) {
  await requestStore(deletesStore, 'readwrite', (store) => store.delete(`${scope}:${kind}:${id}`))
}

export async function pruneReceiptCache(scope, entryIds, removeEmptyFolders = false, cutoff = null) {
  const folders = await listReceiptFolders(scope)
  const receipts = await listReceipts(scope)
  const shouldDiscard = (receipt) => !entryIds.has(receipt.entryId) && (!cutoff || receipt.createdAt <= cutoff)
  const kept = receipts.filter((receipt) => !shouldDiscard(receipt))
  const discarded = receipts.filter(shouldDiscard)
  const discardedFolders = new Set(discarded.map((receipt) => receipt.folderId))
  for (const receipt of discarded) await removeReceipt(scope, receipt.id)
  const keptFolders = new Set(kept.map((receipt) => receipt.folderId))
  for (const folder of folders) {
    if (!keptFolders.has(folder.id) && (removeEmptyFolders || discardedFolders.has(folder.id))) await removeReceiptFolder(scope, folder.id, [])
  }
  return discarded.length
}
