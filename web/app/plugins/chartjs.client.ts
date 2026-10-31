import {
  BarElement, CategoryScale, Chart, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip,
} from 'chart.js'

export default defineNuxtPlugin(() => {
  Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Legend, Tooltip)
  Chart.defaults.font.family = '"Inter Variable", system-ui, sans-serif'
  Chart.defaults.font.size = 12
})
