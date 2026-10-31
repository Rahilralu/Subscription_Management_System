import type { Money } from '~/types/finance'

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
const inrCompact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 })
const plain = new Intl.NumberFormat('en-IN')
const dateFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
const monthFmt = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' })

export const formatMoney = (value: Money | null | undefined) => inr.format(Number(value ?? 0))
export const formatMoneyCompact = (value: Money | null | undefined) => inrCompact.format(Number(value ?? 0))
export const formatNumber = (value: number | null | undefined) => plain.format(value ?? 0)
export const formatDate = (value: string | null | undefined) => (value ? dateFmt.format(new Date(value)) : '—')
export const formatDateTime = (value: string | null | undefined) => (value ? dateTimeFmt.format(new Date(value)) : '—')
// '2026-10' -> 'Oct 26'
export const formatMonth = (value: string) => monthFmt.format(new Date(`${value}-01T00:00:00Z`))

// 'YYYY-MM-DD' in UTC, matching how the API stores dates
export const isoDate = (date: Date) => date.toISOString().slice(0, 10)
export const todayIso = () => isoDate(new Date())
