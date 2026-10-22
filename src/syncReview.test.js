import test from 'node:test'
import assert from 'node:assert/strict'
import { changedRecords } from './syncReview.js'

test('conflict review identifies edits even when both copies have the same counts', () => {
  const device = { wallets: [{ id: 'w', name: 'Travel' }], entries: [{ id: 'e', date: '2026-10-22', type: 'expense', amount: 5 }] }
  const account = { wallets: [{ id: 'w', name: 'Trips' }], entries: [{ id: 'e', date: '2026-10-22', type: 'expense', amount: 6 }] }
  assert.deepEqual(changedRecords(device, account), [
    'Wallet: Travel (edited on both copies)',
    'Transaction: 2026-10-22 · expense (edited on both copies)',
  ])
})

test('conflict review includes planning changes', () => {
  const device = { wallets: [], entries: [], budgets: [{ id: 'food', category: 'Food', limit: 500 }], goals: [] }
  const account = { wallets: [], entries: [], budgets: [{ id: 'food', category: 'Food', limit: 600 }], goals: [{ id: 'trip', name: 'Trip', target: 1000 }] }
  assert.deepEqual(changedRecords(device, account), [
    'Budget: Food (edited on both copies)',
    'Goal: Trip (account only)',
  ])
})
