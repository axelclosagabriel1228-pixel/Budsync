import test from 'node:test'
import assert from 'node:assert/strict'
import { walletBalances } from './finance.js'
import { moveReceiptExpenses, removeReceiptExpenses, upsertReceiptExpense } from './receiptFinance.js'

const wallets = [
  { id: 'organization', openingBalance: 2000 },
  { id: 'personal', openingBalance: 500 },
]
const receipt = { id: 'image-1', entryId: 'entry-1', merchant: 'Supply Shop', note: '', amount: 1000, date: '2026-10-23', reason: '' }
const folder = { id: 'procurement', walletId: 'organization' }

test('a saved receipt deducts its confirmed amount once and an edit updates that expense', () => {
  const created = upsertReceiptExpense([], receipt, folder, '2026-10-23T10:00:00Z')
  assert.equal(walletBalances(wallets, created).organization, 1000)
  const edited = upsertReceiptExpense(created, { ...receipt, amount: 850, reason: 'Corrected total' }, folder, '2026-10-23T11:00:00Z')
  assert.equal(edited.length, 1)
  assert.equal(walletBalances(wallets, edited).organization, 1150)
  assert.equal(edited[0].editHistory[0].note, 'Corrected total')
})

test('deleting a receipt reverses the wallet deduction and moving a folder transfers it', () => {
  const created = upsertReceiptExpense([], receipt, folder, '2026-10-23T10:00:00Z')
  const moved = moveReceiptExpenses(created, ['entry-1'], 'personal', 'New funding wallet', '2026-10-23T11:00:00Z')
  assert.deepEqual(walletBalances(wallets, moved), { organization: 2000, personal: -500 })
  const removed = removeReceiptExpenses(moved, ['entry-1'], '2026-10-23T12:00:00Z')
  assert.deepEqual(walletBalances(wallets, removed), { organization: 2000, personal: 500 })
})
