import test from 'node:test'
import assert from 'node:assert/strict'
import { parseReceiptText } from './receiptText.js'

test('reads a receipt total before cash and keeps the purchase date', () => {
  assert.deepEqual(parseReceiptText('NORTH MARKET\nDate: 2026-10-23\nSubtotal 900.00\nVAT 100.00\nTOTAL PHP 1,000.00\nCash 1,500.00\nChange 500.00'), {
    merchant: 'NORTH MARKET', date: '2026-10-23', amount: 1000, lineItems: [], lineItemTotal: 0,
  })
})

test('leaves uncertain details empty for manual review', () => {
  assert.deepEqual(parseReceiptText('Official Receipt\nTHANK YOU'), { merchant: '', date: '', amount: null, lineItems: [], lineItemTotal: 0 })
})

test('reads item rows and compares their sum with the receipt total', () => {
  const result = parseReceiptText('PAPER SHOP\nPencils 125.00\nFolders 75.00\nTOTAL 200.00')
  assert.deepEqual(result.lineItems, [{ description: 'Pencils', amount: 125 }, { description: 'Folders', amount: 75 }])
  assert.equal(result.lineItemTotal, result.amount)
})
