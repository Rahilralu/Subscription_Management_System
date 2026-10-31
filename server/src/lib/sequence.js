// Call inside the same transaction that creates the record, so a rollback doesn't leave a gap.
export async function nextNumber(tx, prefix, date = new Date()) {
  const key = `${prefix}/${date.getUTCFullYear()}`
  const counter = await tx.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  })
  return `${key}/${String(counter.value).padStart(5, '0')}`
}
