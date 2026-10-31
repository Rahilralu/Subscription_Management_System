// Chart colors per role, with separate light and dark steps (not an automatic flip).
const light = {
  series1: '#2a78d6', series2: '#eb6834', text: '#52514e', grid: 'rgba(11, 11, 11, 0.08)', surface: '#ffffff',
}
const dark = {
  series1: '#3987e5', series2: '#d95926', text: '#c3c2b7', grid: 'rgba(240, 239, 236, 0.10)', surface: '#0f172a',
}

export function useChartTheme() {
  const colorMode = useColorMode()
  return computed(() => (colorMode.value === 'dark' ? dark : light))
}
