<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'

// Horizontal bars for a single measure across a few categories.
const props = withDefaults(defineProps<{
  label: string
  items: { label: string, value: number, detail?: string }[]
  format?: 'money' | 'number'
  series?: 'series1' | 'series2'
}>(), { format: 'number', series: 'series1' })

const theme = useChartTheme()
const fmt = (v: number) => (props.format === 'money' ? formatMoney(v) : formatNumber(v))
const fmtAxis = (v: number) => (props.format === 'money' ? formatMoneyCompact(v) : formatNumber(v))

const data = computed<ChartData<'bar'>>(() => ({
  labels: props.items.map(i => i.label),
  datasets: [{
    label: props.label,
    data: props.items.map(i => i.value),
    backgroundColor: theme.value[props.series],
    borderRadius: 4,
    borderSkipped: 'start',
    barThickness: 16,
  }],
}))

const options = computed<ChartOptions<'bar'>>(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: theme.value.surface,
      titleColor: theme.value.strong,
      bodyColor: theme.value.text,
      borderColor: theme.value.border,
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      boxPadding: 4,
      callbacks: {
        label: (ctx) => {
          const item = props.items[ctx.dataIndex]
          return `${props.label}: ${fmt(ctx.parsed.x ?? 0)}${item?.detail ? ` · ${item.detail}` : ''}`
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: theme.value.grid },
      border: { display: false },
      ticks: { color: theme.value.text, maxTicksLimit: 4, callback: v => fmtAxis(Number(v)) },
    },
    y: { grid: { display: false }, ticks: { color: theme.value.text }, border: { color: theme.value.grid } },
  },
}))
</script>

<template>
  <div :style="{ height: `${Math.max(items.length * 36 + 40, 120)}px` }">
    <Bar :data="data" :options="options" :aria-label="label" role="img" />
  </div>
</template>
