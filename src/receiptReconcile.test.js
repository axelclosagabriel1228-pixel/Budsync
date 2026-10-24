import assert from 'node:assert/strict'
import test from 'node:test'
import { blankData } from './data.js'
import { reconcileReceiptData } from './receiptReconcile.js'

const folder = { id: 'folder-1', walletId: 'personal', createdAt: '2026-01-01T00:00:00Z' }
const receipt = { id: 'receipt-1', entryId: 'entry-1', folderId: 'folder-1', merchant: 'Store', amount: 75,
  date: '2026-01-02', createdAt: '2026-01-02T00:00:00Z' }

test('startup repairs a receipt saved before its wallet expense', () => {
  const data = blankData()
  const repaired = reconcileReceiptData(data, [folder], [receipt], [])
  assert.equal(repaired.entries.length, 1)
  assert.equal(repaired.entries[0].amount, 75)
  assert.equal(reconcileReceiptData(repaired, [folder], [receipt], []), repaired)
})

test('startup applies a pending receipt deletion and respects a backup cutoff', () => {
  const data = reconcileReceiptData(blankData(), [folder], [receipt], [])
  const removed = reconcileReceiptData(data, [], [], [{ kind: 'receipt', id: 'receipt-1' }])
  assert.ok(removed.entries[0].deletedAt)
  assert.equal(reconcileReceiptData({ ...blankData(), receiptSyncCutoff: '2026-01-03T00:00:00Z' }, [folder], [receipt], []).entries.length, 0)
})
