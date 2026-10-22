export function cashFlowByMonth(entries, endingMonth, count = 6) {
  const [year, month] = endingMonth.split('-').map(Number)
  const months = Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - count + index, 1))
    const key = date.toISOString().slice(0, 7)
    return { key, label: date.toLocaleDateString('en-PH', { month: 'short', timeZone: 'UTC' }), income: 0, expenses: 0 }
  })
  const byKey = new Map(months.map((item) => [item.key, item]))
  for (const entry of entries) {
    if (entry.deletedAt || !['income', 'expense'].includes(entry.type)) continue
    const monthItem = byKey.get(entry.date.slice(0, 7))
    if (monthItem) monthItem[entry.type === 'income' ? 'income' : 'expenses'] += entry.amount
  }
  return months
}

export function monthComparison(current, previous) {
  if (previous === 0) return current > 0 ? 'First activity this month' : 'No activity yet'
  const change = Math.round((current - previous) / previous * 100)
  return `${change > 0 ? '+' : ''}${change}% vs last month`
}

export function budgetUsage(categories, budget) {
  const spent = categories.filter(([category]) => category.toLowerCase() === budget.category.toLowerCase())
    .reduce((total, [, amount]) => total + amount, 0)
  return { spent, remaining: budget.limit - spent, percent: Math.min(100, spent / budget.limit * 100) }
}
