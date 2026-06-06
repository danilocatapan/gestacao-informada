import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');
const base = 'gestacao-informada';
const expectedPages = ['', 'entender-a-perda', 'trombofilias-e-investigacao', 'acolhimento-e-luto', 'direitos'];
const failures = [];
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

for (const forbidden of ['legal', path.join('artigos', 'rascunho-principios-editoriais')]) {
  if (await exists(path.join(dist, forbidden))) failures.push(`Conteúdo não publicável presente em dist/${forbidden}`);
}
const robots = await readFile(path.join(dist, 'robots.txt'), 'utf8');
if (!robots.includes(`https://danilocatapan.github.io/${base}/sitemap-index.xml`)) failures.push('robots.txt não aponta para sitemap-index.xml canônico.');
if (!(await exists(path.join(dist, 'sitemap-index.xml')))) failures.push('sitemap-index.xml ausente.');
if (!(await readdir(dist)).some((file) => /^sitemap-\d+\.xml$/.test(file))) failures.push('Arquivo numerado de sitemap ausente.');

if (failures.length) {
  console.error(`Validação do build falhou:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Build validado: rotas, URLs, SEO e bloqueios editoriais estão corretos.');
