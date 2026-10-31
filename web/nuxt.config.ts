export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  // internal app behind a login, so no need for SSR
  ssr: false,
  modules: ['@nuxt/ui', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],

  // keep fonts and icons local so the app works offline
  ui: { fonts: false },
  icon: {
    localApiEndpoint: '/_nuxt_icon',
    serverBundle: 'local',
    clientBundle: { scan: true },
    fallbackToApi: false,
  },

  routeRules: {
    '/api/**': { proxy: `${process.env.API_BASE_URL ?? 'http://localhost:4000'}/api/**` },
  },
})
