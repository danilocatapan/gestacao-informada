import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://danilocatapan.github.io',
  base: '/gestacao-informada',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/artigos/rascunho-') &&
        !page.includes('/legal/') &&
        !page.includes('/review-notes/'),
    }),
  ],
});
