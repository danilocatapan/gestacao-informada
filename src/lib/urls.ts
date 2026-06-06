const normalizePath = (path: string) => path.replace(/^\/+/, '');

export function withBaseUrl(path = ''): string {
  const relativePath = normalizePath(path);
  return relativePath ? `${import.meta.env.BASE_URL}${relativePath}` : import.meta.env.BASE_URL;
}

export function withCanonicalUrl(path = ''): string {
  const site = import.meta.env.SITE;
  if (!site) throw new Error('Astro site URL is required to build canonical URLs.');
  return new URL(withBaseUrl(path), site).toString();
}
