import test from 'node:test'
import assert from 'node:assert/strict'
import { budgetUsage, cashFlowByMonth } from './insights.js'

test('cash flow chart uses recorded income and expenses only', () => {
  const entries = [
    { date: '2026-09-12', type: 'income', amount: 200, deletedAt: null },
    { date: '2026-10-02', type: 'expense', amount: 35, deletedAt: null },
    { date: '2026-10-03', type: 'transfer', amount: 90, deletedAt: null },
    { date: '2026-10-04', type: 'expense', amount: 10, deletedAt: '2026-10-05' },
  ]
  assert.deepEqual(cashFlowByMonth(entries, '2026-10', 2).map(({ key, income, expenses }) => ({ key, income, expenses })), [
    { key: '2026-09', income: 200, expenses: 0 },
    { key: '2026-10', income: 0, expenses: 35 },
  ])
})

test('budget progress combines matching categories and reports overspending', () => {
  assert.deepEqual(budgetUsage([['Food', 80], ['food', 45], ['Bills', 20]], { category: 'FOOD', limit: 100 }), {
    spent: 125, remaining: -25, percent: 100,
  })
})
