import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const dist = path.join(process.cwd(), 'dist');
const content = path.join(process.cwd(), 'src', 'content');
const base = 'gestacao-informada';
const expectedPages = ['', 'entender-a-perda', 'trombofilias-e-investigacao', 'acolhimento-e-luto', 'direitos', 'materiais', 'sobre'];
const legalPublicSlugs = new Map([
  ['privacidade', 'privacidade'],
  ['termos-de-uso', 'termos'],
  ['politica-editorial', 'politica-editorial'],
]);
const failures = [];
const approvedLegalRoutes = [];
const blockedLegalRoutes = [];
const approvedArticleRoutes = [];
const blockedArticleRoutes = [];
let legalGuideStatus;
const exists = async (file) => { try { await access(file); return true; } catch { return false; } };

for (const page of expectedPages) {
  const file = path.join(dist, page, 'index.html');
  if (!(await exists(file))) { failures.push(`Rota esperada ausente: /${page}/`); continue; }
  const html = await readFile(file, 'utf8');
  const canonical = `https://danilocatapan.github.io/${base}/${page ? `${page}/` : ''}`;
  if (!html.includes(`rel="canonical" href="${canonical}"`)) failures.push(`Canonical incorreto em /${page}/`);
  if (!html.includes('"@type":"WebSite"') || !html.includes('"@type":"Organization"')) failures.push(`JSON-LD básico ausente em /${page}/`);
  if (/(?:href|src)="\/(?!gestacao-informada\/)/g.test(html)) failures.push(`Link ou ativo sem base path em /${page}/`);
}

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? markdownFiles(path.join(directory, entry.name)) : path.join(directory, entry.name))))
    .flat()
    .filter((file) => /\.(md|mdx)$/i.test(file));
}

function frontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? parseYaml(match[1]) ?? {} : {};
}

for (const collection of ['pages', 'articles', 'legal']) {
  for (const file of await markdownFiles(path.join(content, collection))) {
    const data = frontmatter(await readFile(file, 'utf8'));
    const status = data.status;
    if (!['draft', 'in_review', 'approved', 'archived'].includes(status)) failures.push(`Status editorial inválido em ${file}`);
    const id = path.basename(file).replace(/\.(md|mdx)$/i, '');

    if (collection === 'legal' && data.contentType === 'legal-guide') {
      legalGuideStatus = status;
      continue;
    }
    if (collection === 'legal' && status === 'approved') {
      const expectedSlug = legalPublicSlugs.get(id);
      if (data.slug !== expectedSlug) failures.push(`Slug público incorreto para legal/${id}.`);
      if (data.slug) approvedLegalRoutes.push(data.slug);
      continue;
    }
    if (collection === 'articles' && status === 'approved') approvedArticleRoutes.push(path.join('artigos', id));
    if (status === 'approved') continue;

    const routes = collection === 'articles'
      ? [path.join('artigos', id)]
      : collection === 'legal'
        ? [legalPublicSlugs.get(id), id, path.join('legal', id), data.slug].filter(Boolean)
        : [id];
    for (const route of routes) {
      if (collection === 'legal') blockedLegalRoutes.push(route);
      if (collection === 'articles') blockedArticleRoutes.push(route);
      if (await exists(path.join(dist, route))) failures.push(`Conteúdo não publicável presente em dist/${route}`);
    }
  }
}

for (const route of approvedLegalRoutes) {
  const file = path.join(dist, route, 'index.html');
  if (!(await exists(file))) { failures.push(`Rota jurídica aprovada ausente: /${route}/`); continue; }
  const html = await readFile(file, 'utf8');
  const canonical = `https://danilocatapan.github.io/${base}/${route}/`;
  if (!html.includes(`rel="canonical" href="${canonical}"`)) failures.push(`Canonical incorreto em /${route}/`);
}

const rightsHtml = await readFile(path.join(dist, 'direitos', 'index.html'), 'utf8');
if (legalGuideStatus === 'approved') {
  if (!rightsHtml.includes('data-legal-guide')) failures.push('Guia jurídico aprovado ausente de /direitos/.');
  for (const route of approvedLegalRoutes) {
    if (!rightsHtml.includes(`href="/${base}/${route}/"`)) failures.push(`Link jurídico publicado ausente de /direitos/: /${route}/`);
  }
} else {
  if (rightsHtml.includes('data-legal-guide')) failures.push('Guia jurídico não aprovado vazou em /direitos/.');
  if (rightsHtml.includes('Você não precisa compreender tudo de uma vez')) failures.push('Texto do guia jurídico não aprovado vazou em /direitos/.');
}

const robots = await readFile(path.join(dist, 'robots.txt'), 'utf8');
if (!robots.includes(`https://danilocatapan.github.io/${base}/sitemap-index.xml`)) failures.push('robots.txt não aponta para sitemap-index.xml canônico.');
if (!(await exists(path.join(dist, 'sitemap-index.xml')))) failures.push('sitemap-index.xml ausente.');
const sitemapFiles = (await readdir(dist)).filter((file) => /^sitemap-\d+\.xml$/.test(file));
if (sitemapFiles.length === 0) failures.push('Arquivo numerado de sitemap ausente.');
const sitemap = (await Promise.all(sitemapFiles.map((file) => readFile(path.join(dist, file), 'utf8')))).join('\n');
for (const route of approvedLegalRoutes) {
  if (!sitemap.includes(`/${base}/${route}/`)) failures.push(`Rota jurídica aprovada ausente do sitemap: /${route}/`);
}
for (const route of blockedLegalRoutes) {
  if (sitemap.includes(`/${base}/${route}/`)) failures.push(`Rota jurídica não aprovada presente no sitemap: /${route}/`);
}
for (const route of approvedArticleRoutes) {
  const publicRoute = route.replaceAll('\\', '/');
  if (!sitemap.includes(`/${base}/${publicRoute}/`)) failures.push(`Artigo aprovado ausente do sitemap: /${publicRoute}/`);
}
for (const route of blockedArticleRoutes) {
  const publicRoute = route.replaceAll('\\', '/');
  if (sitemap.includes(`/${base}/${publicRoute}/`)) failures.push(`Artigo não aprovado presente no sitemap: /${publicRoute}/`);
}

if (failures.length) {
  console.error(`Validação do build falhou:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Build validado: rotas, URLs, SEO e bloqueios editoriais estão corretos.');
