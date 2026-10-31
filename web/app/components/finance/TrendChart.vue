<script setup lang="ts">
import { Line } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import type { Charts } from '~/types/finance'

const props = defineProps<{ monthly: Charts['monthly'] }>()
const theme = useChartTheme()

const data = computed<ChartData<'line'>>(() => ({
  labels: props.monthly.map(m => formatMonth(m.month)),
  datasets: [
    {
      label: 'Collected',
      data: props.monthly.map(m => m.collected),
      borderColor: theme.value.series1,
      // soft fade under the main line; the chart area only exists once it has been laid out
      fill: true,
      backgroundColor: (ctx) => {
        const area = ctx.chart.chartArea
        if (!area) return 'transparent'
        const gradient = ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom)
        gradient.addColorStop(0, theme.value.areaFrom)
        gradient.addColorStop(1, theme.value.areaTo)
        return gradient
      },
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBorderColor: theme.value.surface,
      pointHoverBorderWidth: 2,
      tension: 0.25,
    },
    {
      label: 'Invoiced',
      data: props.monthly.map(m => m.invoiced),
      borderColor: theme.value.series2,
      backgroundColor: theme.value.series2,
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBorderColor: theme.value.surface,
      pointHoverBorderWidth: 2,
      tension: 0.25,
    },
  ],
}))

const options = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      position: 'top',
      align: 'end',
      labels: { color: theme.value.text, usePointStyle: true, pointStyle: 'line', boxWidth: 24 },
    },
    tooltip: {
      backgroundColor: theme.value.surface,
      titleColor: theme.value.strong,
      bodyColor: theme.value.text,
      borderColor: theme.value.border,
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      boxPadding: 4,
      callbacks: { label: ctx => `${ctx.dataset.label}: ${formatMoney(ctx.parsed.y)}` },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: theme.value.text }, border: { color: theme.value.grid } },
    y: {
      beginAtZero: true,
      grid: { color: theme.value.grid },
      border: { display: false },
      ticks: { color: theme.value.text, maxTicksLimit: 5, callback: v => formatMoneyCompact(Number(v)) },
    },
  },
}))
</script>

<template>
  <div class="h-72">
    <Line :data="data" :options="options" aria-label="Monthly invoiced and collected amounts" role="img" />
  </div>
</template>
