<script setup lang="ts">
defineProps<{
  subtotal: string
  discountTotal: string
  taxTotal: string
  total: string
  paid?: string
  due?: string
}>()
</script>

<template>
  <dl class="ml-auto w-full max-w-xs space-y-1 text-sm">
    <div class="flex justify-between"><dt class="text-muted">Subtotal</dt><dd>{{ formatMoney(subtotal) }}</dd></div>
    <div class="flex justify-between"><dt class="text-muted">Discount</dt><dd>- {{ formatMoney(discountTotal) }}</dd></div>
    <div class="flex justify-between"><dt class="text-muted">Tax</dt><dd>{{ formatMoney(taxTotal) }}</dd></div>
    <div class="flex justify-between border-t border-default pt-1 font-semibold"><dt>Total</dt><dd>{{ formatMoney(total) }}</dd></div>
    <template v-if="paid !== undefined && due !== undefined">
      <div class="flex justify-between"><dt class="text-muted">Paid</dt><dd>{{ formatMoney(paid) }}</dd></div>
      <div class="flex justify-between font-semibold"><dt>Amount due</dt><dd>{{ formatMoney(due) }}</dd></div>
    </template>
  </dl>
</template>
