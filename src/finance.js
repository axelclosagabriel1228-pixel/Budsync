export function entryImpact(entry, walletId) {
  if (entry.deletedAt) return 0
  if (entry.type === 'transfer') {
    if (entry.fromWalletId === walletId) return -entry.amount
    if (entry.toWalletId === walletId) return entry.amount
    return 0
  }
  if (entry.walletId !== walletId) return 0
  return entry.type === 'expense' || (entry.type === 'adjustment' && entry.adjustmentEffect === 'decrease')
    ? -entry.amount
    : entry.amount
}

export function walletBalances(wallets, entries) {
  return Object.fromEntries(wallets.map((wallet) => [
    wallet.id,
    wallet.openingBalance + entries.reduce((total, entry) => total + entryImpact(entry, wallet.id), 0),
  ]))
}

export function monthlyReport(wallets, entries, month) {
  const items = entries.filter((entry) => !entry.deletedAt && entry.date.startsWith(month))
  const income = items.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0)
  const expenses = items.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0)
  const categories = Object.entries(items.filter((entry) => entry.type === 'expense').reduce((totals, entry) => {
    const category = entry.category || 'Uncategorized'
    totals[category] = (totals[category] || 0) + entry.amount
    return totals
  }, {})).sort((a, b) => b[1] - a[1])
  const byWallet = wallets.map((wallet) => ({
    id: wallet.id,
    name: wallet.name,
    income: items.filter((entry) => entry.type === 'income' && entry.walletId === wallet.id).reduce((sum, entry) => sum + entry.amount, 0),
    expenses: items.filter((entry) => entry.type === 'expense' && entry.walletId === wallet.id).reduce((sum, entry) => sum + entry.amount, 0),
  }))
  return { income, expenses, net: income - expenses, categories, byWallet }
}
