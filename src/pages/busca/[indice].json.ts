import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { canPublishGlossary } from '../../lib/publication';
import { deduplicateSearchItems, type SearchItem } from '../../lib/search';
import { withBaseUrl } from '../../lib/urls';

export async function getStaticPaths() {
  const pages = await getCollection('pages', ({ data }) => data.status === 'approved');
  const articles = await getCollection('articles', ({ data }) => data.status === 'approved');
  const glossary = await getCollection('glossary', ({ data }) => data.status === 'approved');
  const legal = await getCollection('legal', ({ data }) => data.status === 'approved');
  const publicGlossary = canPublishGlossary(articles.length, glossary.length) ? glossary : [];
  const items: SearchItem[] = [
    ...pages.map((entry) => ({
      title: entry.data.title,
      summary: entry.data.description,
      url: withBaseUrl(`${entry.id}/`),
      type: entry.data.contentType === 'checklist' ? 'Material' : 'Página',
      text: entry.body ?? '',
    })),
    ...articles.map((entry) => ({
      title: entry.data.title,
      summary: entry.data.description,
      url: withBaseUrl(`artigos/${entry.id}/`),
      type: 'Artigo',
      text: entry.body ?? '',
    })),
    ...publicGlossary.map((entry) => ({
      title: entry.data.term,
      summary: entry.data.shortDefinition,
      url: withBaseUrl(`glossario/${entry.data.slug}/`),
      type: 'Glossário',
      text: entry.data.fullDefinition,
    })),
    ...legal.map((entry) => ({
      title: entry.data.title,
      summary: entry.data.description,
      url: withBaseUrl(entry.data.contentType === 'legal-guide' ? 'direitos/' : `${entry.data.slug}/`),
      type: entry.data.contentType === 'legal-guide' ? 'Guia jurídico' : 'Documento jurídico',
      text: entry.body ?? '',
    })),
  ];

  return [{ params: { indice: 'indice' }, props: { items: deduplicateSearchItems(items) } }];
}

export const GET: APIRoute = ({ props }) => new Response(JSON.stringify(props.items), {
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});
