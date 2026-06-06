import type { APIRoute } from 'astro';
import { withCanonicalUrl } from '../lib/urls';

export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\nSitemap: ${withCanonicalUrl('sitemap-index.xml')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
