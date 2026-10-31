// Why a subscription can't move to newPlan right now, or null when it can.
// The messages are shown to staff, so they read as plain sentences.
export function planChangeProblem(subscription, newPlan, today) {
  if (subscription.status !== 'ACTIVE') {
    return `This subscription is ${subscription.status.toLowerCase()}, only active subscriptions can change plan`
  }
  if (!newPlan.active) return `The ${newPlan.name} plan is not available`
  if (newPlan.id === subscription.planId) return `This subscription is already on the ${newPlan.name} plan`

  const tooSmall = subscription.lines.find((line) => line.quantity < newPlan.minQuantity)
  if (tooSmall) {
    return `${tooSmall.product.name} has a quantity of ${tooSmall.quantity}, but the ${newPlan.name} plan needs at least ${newPlan.minQuantity}`
  }

  // the change starts from the next invoice, so anything already due is billed on the old plan first
  if (subscription.nextInvoiceDate && subscription.nextInvoiceDate <= today) {
    return 'This subscription has invoices due, run billing before changing its plan'
  }
  return null
}
