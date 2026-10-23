import test from 'node:test'
import assert from 'node:assert/strict'
import { possibleDuplicateReceipts } from './receiptDuplicates.js'

test('flags matching image or confirmed merchant, date, and amount', () => {
  const stored = [{ id: 'one', merchant: 'ABC Store', date: '2026-10-23', amount: 1000, imageHash: 'hash-a' }]
  assert.equal(possibleDuplicateReceipts(stored, { merchant: 'ABC STORE!', date: '2026-10-23', amount: 1000 }, null).length, 1)
  assert.equal(possibleDuplicateReceipts(stored, { merchant: 'Other', date: '2026-10-24', amount: 500, imageHash: 'hash-a' }, null).length, 1)
  assert.equal(possibleDuplicateReceipts(stored, { merchant: 'Other', date: '2026-10-24', amount: 500 }, null).length, 0)
  assert.equal(possibleDuplicateReceipts(stored, { merchant: 'ABC STORE!', date: '2026-10-23', amount: 1000 }, 'one').length, 0)
})
