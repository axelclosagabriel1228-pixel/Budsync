import assert from 'node:assert/strict'
import test from 'node:test'
import { monthlyReport, previewEntryBalances, walletBalances } from './finance.js'

const wallets = [
  { id: 'personal', openingBalance: 1000 },
  { id: 'savings', openingBalance: 300 },
  { id: 'organization', openingBalance: 500 },
]

test('the V1 hand-test sequence keeps transfers neutral to the combined balance', () => {
  const entries = []
  const balance = (id) => walletBalances(wallets, entries)[id]
  entries.push({ type: 'income', walletId: 'personal', amount: 200 })
  assert.equal(balance('personal'), 1200)
  entries.push({ type: 'expense', walletId: 'personal', amount: 150 })
  assert.equal(balance('personal'), 1050)
  entries.push({ type: 'adjustment', walletId: 'personal', adjustmentEffect: 'increase', amount: 20 })
  assert.equal(balance('personal'), 1070)
  entries.push({ type: 'transfer', fromWalletId: 'personal', toWalletId: 'savings', amount: 100 })
  assert.equal(balance('personal'), 970)
  assert.equal(balance('savings'), 400)
  assert.equal(Object.values(walletBalances(wallets, entries)).reduce((sum, value) => sum + value, 0), 1870)
  entries[1] = { ...entries[1], amount: 120 }
  assert.equal(balance('personal'), 1000)
})

test('deleted entries do not affect balances or monthly reports', () => {
  const entries = [
    { id: 'a', type: 'income', walletId: 'personal', amount: 200, date: '2026-10-02' },
    { id: 'b', type: 'expense', walletId: 'personal', amount: 50, category: 'Food', date: '2026-10-03' },
    { id: 'c', type: 'transfer', fromWalletId: 'personal', toWalletId: 'savings', amount: 100, date: '2026-10-04' },
    { id: 'd', type: 'expense', walletId: 'personal', amount: 25, category: 'Food', date: '2026-10-05', deletedAt: '2026-10-06T00:00:00Z' },
  ]
  assert.equal(walletBalances(wallets, entries).personal, 1050)
  const report = monthlyReport(wallets, entries, '2026-10')
  assert.equal(report.income, 200)
  assert.equal(report.expenses, 50)
  assert.equal(report.net, 150)
  assert.deepEqual(report.categories, [['Food', 50]])
})

test('entry preview shows both transfer wallets and the true impact of an edit', () => {
  const previous = { type: 'expense', walletId: 'personal', amount: 50 }
  const balances = walletBalances(wallets, [previous])
  const transfer = previewEntryBalances(wallets, balances,
    { type: 'transfer', fromWalletId: 'personal', toWalletId: 'savings', amount: '100' }, previous)
  assert.deepEqual(transfer.changes.map(({ id, after }) => [id, after]), [['personal', 900], ['savings', 400]])
  assert.equal(transfer.combinedDelta, 50)
  const newTransfer = previewEntryBalances(wallets, balances,
    { type: 'transfer', fromWalletId: 'personal', toWalletId: 'savings', amount: '100' })
  assert.equal(newTransfer.combinedDelta, 0)
  assert.equal(previewEntryBalances(wallets, balances,
    { type: 'transfer', fromWalletId: 'personal', toWalletId: 'personal', amount: '100' }), null)
})
