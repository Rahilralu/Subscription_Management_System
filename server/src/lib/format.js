// for emails and PDFs; the web app formats its own numbers
export function formatAmount(value) {
  return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const formatMoney = (value) => `Rs. ${formatAmount(value)}`

export function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
}
