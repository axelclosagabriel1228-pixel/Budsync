export function changedRecords(device, account) {
  const changes = []
  for (const [label, deviceItems, accountItems] of [
    ['Wallet', device.wallets, account.wallets],
    ['Transaction', device.entries, account.entries],
    ['Budget', device.budgets || [], account.budgets || []],
    ['Goal', device.goals || [], account.goals || []],
  ]) {
    const onDevice = new Map(deviceItems.map((item) => [item.id, item]))
    const inAccount = new Map(accountItems.map((item) => [item.id, item]))
    for (const id of new Set([...onDevice.keys(), ...inAccount.keys()])) {
      const local = onDevice.get(id)
      const remote = inAccount.get(id)
      if (JSON.stringify(local) === JSON.stringify(remote)) continue
      const name = label === 'Transaction' ? `${(local || remote).date} · ${(local || remote).type}`
        : label === 'Budget' ? (local || remote).category : (local || remote).name
      changes.push(`${label}: ${name} (${!local ? 'account only' : !remote ? 'device only' : 'edited on both copies'})`)
    }
  }
  return changes
}
