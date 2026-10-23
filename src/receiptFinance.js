export function upsertReceiptExpense(entries, receipt, folder, timestamp) {
  const previous = entries.find((entry) => entry.id === receipt.entryId)
  const shared = {
    type: 'expense', walletId: folder.walletId, fromWalletId: null, toWalletId: null,
    adjustmentEffect: null, amount: receipt.amount, date: receipt.date,
    category: 'Receipts', note: [receipt.merchant, receipt.note].filter(Boolean).join(' · ').slice(0, 300),
    receiptId: receipt.id, receiptFolderId: folder.id, deletedAt: null,
  }
  const entry = previous ? {
    ...previous, ...shared, updatedAt: timestamp, editNote: receipt.reason,
    editHistory: [...(previous.editHistory || []), { at: timestamp, note: receipt.reason }],
  } : {
    id: receipt.entryId, ...shared, createdAt: timestamp, updatedAt: null,
    editNote: '', editHistory: [],
  }
  return previous ? entries.map((item) => item.id === entry.id ? entry : item) : [entry, ...entries]
}

export function removeReceiptExpenses(entries, ids, timestamp) {
  const removed = new Set(ids)
  return entries.map((entry) => removed.has(entry.id) ? { ...entry, deletedAt: timestamp } : entry)
}

export function moveReceiptExpenses(entries, ids, walletId, reason, timestamp) {
  const moved = new Set(ids)
  return entries.map((entry) => moved.has(entry.id) && !entry.deletedAt ? {
    ...entry, walletId, updatedAt: timestamp, editNote: reason,
    editHistory: [...(entry.editHistory || []), { at: timestamp, note: reason }],
  } : entry)
}
