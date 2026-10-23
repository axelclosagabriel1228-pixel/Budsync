const normalized = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function possibleDuplicateReceipts(receipts, draft, excludeId = null) {
  return receipts.filter((receipt) => {
    if (receipt.id === excludeId) return false
    if (draft.imageHash && receipt.imageHash && draft.imageHash === receipt.imageHash) return true
    return Boolean(normalized(draft.merchant) && draft.date && draft.amount)
      && normalized(receipt.merchant) === normalized(draft.merchant)
      && receipt.date === draft.date
      && Math.round(Number(receipt.amount) * 100) === Math.round(Number(draft.amount) * 100)
  })
}
