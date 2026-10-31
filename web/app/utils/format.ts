const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

export function formatMoney(value: string | number) {
  return money.format(Number(value))
}
