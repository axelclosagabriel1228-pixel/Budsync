import assert from 'node:assert/strict'
import test from 'node:test'
import { backupJson, blankData, parseBackup, transactionsCsv, validateData } from './data.js'

test('new workspaces ask for opening balances while older saved data stays set up', () => {
  const fresh = blankData()
  assert.equal(fresh.setupComplete, false)
  assert.ok(fresh.wallets.every((wallet) => wallet.openingBalance === 0))
  const older = { ...fresh }
  delete older.setupComplete
  assert.equal(validateData(older).setupComplete, true)
})

test('a V1 record migrates into a restorable V2 backup', () => {
  const old = { ...blankData(), version: 1, entries: [{ id: 'one', type: 'expense', walletId: 'personal', amount: 12.5, date: '2026-10-22', category: 'Food', note: 'Lunch' }] }
  const migrated = validateData(old)
  assert.equal(migrated.version, 2)
  assert.equal(migrated.entries[0].deletedAt, null)
  assert.equal(parseBackup(backupJson(migrated)).entries[0].amount, 12.5)
})

test('restore rejects broken references and same-wallet transfers', () => {
  const backup = blankData()
  backup.entries = [{ id: 'one', type: 'transfer', fromWalletId: 'personal', toWalletId: 'personal', amount: 20, date: '2026-10-22' }]
  assert.throws(() => parseBackup(backupJson(backup)), /invalid transfer/)
})

test('CSV export protects note fields from spreadsheet formulas', () => {
  const data = blankData()
  data.entries = [{ id: 'one', type: 'expense', walletId: 'personal', amount: 10, date: '2026-10-22', note: '=1+1' }]
  assert.match(transactionsCsv(data), /"'=1\+1"/)
})

test('budgets and savings goals survive backup and require valid references', () => {
  const data = blankData()
  data.receiptSyncCutoff = '2026-10-24T00:00:00.000Z'
  data.budgets = [{ id: 'food', category: 'Food', limit: 500 }]
  data.goals = [{ id: 'rainy-day', name: 'Rainy day', target: 5000, walletId: 'savings' }]
  const restored = parseBackup(backupJson(data))
  assert.deepEqual(restored.budgets, data.budgets)
  assert.deepEqual(restored.goals, data.goals)
  assert.equal(restored.receiptSyncCutoff, data.receiptSyncCutoff)
  assert.throws(() => validateData({ ...data, goals: [{ ...data.goals[0], walletId: 'missing' }] }), /invalid savings goal/)
})
