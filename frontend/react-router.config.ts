import type { Config } from '@react-router/dev/config'

export default {
  ssr: true,
  // Prerender only public pages for SEO (social unfurling)
  async prerender() {
    return [
      '/',
      '/pricing',
      '/login',
      '/register',
      '/legal',
      '/forgot-password',
      '/reset-password'
    ];
  }
} satisfies Config
