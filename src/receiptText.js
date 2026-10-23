const amountPattern = /(?:₱|PHP|P\s*[:.]?\s*)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+(?:\.\d{2}))/gi
const datePattern = /\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b|\b(0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])[-/.](20\d{2})\b/

function validDate(year, month, day) {
  const value = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : ''
}

export function parseReceiptText(text) {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const merchant = lines.find((line) => /[a-z]{3}/i.test(line) && !/^(official receipt|sales invoice|receipt|invoice|date|tin|vat\b|thank you\b)/i.test(line))?.slice(0, 80) || ''
  let date = ''
  for (const line of lines) {
    const match = line.match(datePattern)
    if (!match) continue
    date = match[1] ? validDate(match[1], match[2], match[3]) : validDate(match[6], match[4], match[5])
    if (date) break
  }
  const candidates = lines.flatMap((line) => {
    const matches = [...line.matchAll(amountPattern)]
    const priority = /(?:grand\s+total|total\s+(?:due|amount)|amount\s+due|net\s+total|balance\s+due|^total\b)/i.test(line) ? 3
      : /(?:₱|\bPHP\b)/i.test(line) ? 2 : 0
    if (/\b(change|cash tendered|cash received|tax|vat)\b/i.test(line) && !priority) return []
    return matches.map((match) => ({ amount: Number(match[1].replaceAll(',', '')), priority }))
      .filter((item) => Number.isFinite(item.amount) && item.amount > 0)
  })
  candidates.sort((a, b) => b.priority - a.priority || b.amount - a.amount)
  const lineItems = lines.flatMap((line) => {
    if (/\b(total|subtotal|sub total|vat|tax|cash|change|balance|amount due|date|invoice|receipt|discount)\b/i.test(line)) return []
    const match = line.match(/^(.*?)\s+(?:₱|PHP\s*)?(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2})\s*$/i)
    if (!match || !/[a-z]{2}/i.test(match[1])) return []
    const amount = Number(`${match[2].replaceAll(',', '')}.${match[3]}`)
    return amount > 0 ? [{ description: match[1].trim().slice(0, 100), amount }] : []
  })
  const lineItemTotal = Math.round(lineItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100
  return { merchant, date, amount: candidates[0]?.priority ? candidates[0].amount : null, lineItems, lineItemTotal }
}
