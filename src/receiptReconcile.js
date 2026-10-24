import { removeReceiptExpenses, upsertReceiptExpense } from './receiptFinance.js'

export function reconcileReceiptData(data, folders, receipts, deletes) {
  const deletedReceipts = new Set(deletes.filter((item) => item.kind === 'receipt').map((item) => item.id))
  const deletedFolders = new Set(deletes.filter((item) => item.kind === 'folder').map((item) => item.id))
  const deletedEntries = data.entries.filter((entry) => entry.receiptId
    && (deletedReceipts.has(entry.receiptId) || deletedFolders.has(entry.receiptFolderId)))
    .map((entry) => entry.id)
  let entries = deletedEntries.length
    ? removeReceiptExpenses(data.entries, deletedEntries, new Date().toISOString())
    : data.entries
  let changed = deletedEntries.some((id) => data.entries.find((entry) => entry.id === id && !entry.deletedAt))
  const folderById = new Map(folders.map((folder) => [folder.id, folder]))
  for (const receipt of receipts) {
    if (deletedReceipts.has(receipt.id) || deletedFolders.has(receipt.folderId)) continue
    const folder = folderById.get(receipt.folderId)
    if (!folder || !data.wallets.some((wallet) => wallet.id === folder.walletId)) continue
    const previous = entries.find((entry) => entry.id === receipt.entryId)
    if (previous?.deletedAt || (!previous && data.receiptSyncCutoff && receipt.createdAt <= data.receiptSyncCutoff)) continue
    const latest = [receipt.updatedAt, receipt.createdAt, folder.updatedAt, folder.createdAt].filter(Boolean).sort().at(-1) || ''
    if (previous && latest <= (previous.updatedAt || previous.createdAt || '')) continue
    entries = upsertReceiptExpense(entries, receipt, folder, latest)
    changed = true
  }
  return changed ? { ...data, entries } : data
}
