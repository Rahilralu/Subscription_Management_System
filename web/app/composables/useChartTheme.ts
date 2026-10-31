// Chart colors per role, with separate light and dark steps (not an automatic flip).
// Series colors were checked with the dataviz validator: lightness band, chroma, color-blind
// separation and 3:1 contrast against the card surface (white in light mode, zinc-900 in dark).
const light = {
  series1: '#5b5bf0', series2: '#d97706',
  areaFrom: 'rgba(91, 91, 240, 0.22)', areaTo: 'rgba(91, 91, 240, 0)',
  text: '#71717a', strong: '#18181b', grid: 'rgba(24, 24, 27, 0.07)', surface: '#ffffff', border: '#e4e4e7',
}
const dark = {
  series1: '#6f71f2', series2: '#d97706',
  areaFrom: 'rgba(111, 113, 242, 0.30)', areaTo: 'rgba(111, 113, 242, 0)',
  text: '#a1a1aa', strong: '#fafafa', grid: 'rgba(250, 250, 250, 0.08)', surface: '#18181b', border: '#3f3f46',
}

export function useChartTheme() {
  const colorMode = useColorMode()
  return computed(() => (colorMode.value === 'dark' ? dark : light))
}
