import { addDays, daysBetween } from '../../lib/dates.js'

// whole days a subscription sat paused; both arguments are date-only values
export const daysPaused = (pausedOn, resumedOn) => Math.max(0, daysBetween(pausedOn, resumedOn))

// Pausing freezes the clock: time spent paused is neither billed nor used up,
// so the next invoice and the end date both move back by the days paused.
export function shiftForPause({ nextInvoiceDate, expiryDate }, days) {
  return {
    nextInvoiceDate: nextInvoiceDate ? addDays(nextInvoiceDate, days) : null,
    expiryDate: expiryDate ? addDays(expiryDate, days) : null,
  }
}
