import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const root = process.cwd();
const output = path.join(root, 'src', 'content', 'references');
const slug = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/g, '');
const shortHash = (value) => createHash('sha256').update(value).digest('hex').slice(0, 8);

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? markdownFiles(path.join(directory, entry.name))
    : path.join(directory, entry.name)))).flat().filter((file) => /\.mdx?$/i.test(file));
}

function frontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? parseYaml(match[1]) ?? {} : {};
}

await mkdir(output, { recursive: true });
const known = new Set();
for (const file of await readdir(output)) {
  if (!file.endsWith('.json')) continue;
  const filePath = path.join(output, file);
  const entry = JSON.parse(await readFile(filePath, 'utf8'));
  const normalizedId = entry.id.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  if (normalizedId !== entry.id) {
    entry.id = normalizedId;
    const nextPath = path.join(output, `${normalizedId}.json`);
    await writeFile(filePath, `${JSON.stringify(entry, null, 2)}\n`, 'utf8');
    await rename(filePath, nextPath);
  }
  known.add(entry.url);
}

let created = 0;
for (const collection of ['articles', 'glossary', 'legal']) {
  for (const file of await markdownFiles(path.join(root, 'src', 'content', collection))) {
    const data = frontmatter(await readFile(file, 'utf8'));
    for (const source of data.sources ?? []) {
      if (known.has(source.url)) continue;
      const base = slug(`${source.publisher}-${source.title}`) || `reference-${shortHash(source.url)}`;
      const id = `${base}-${shortHash(source.url)}`;
      const type = source.type === 'law' ? 'law'
        : source.type === 'guideline' ? 'guideline'
          : source.type === 'review' ? 'review'
            : source.type === 'institutional' ? 'institutional'
              : 'other';
      const entry = {
        id,
        title: source.title,
        url: source.url,
        publisher: source.publisher,
        type,
        domain: collection === 'legal' ? 'legal' : 'clinical',
        authorityLevel: ['law', 'guideline'].includes(type) ? 'high' : 'medium',
        summary: 'Referência centralizada a partir de conteúdo editorial existente.',
        usableFor: ['fundamentação e revisão editorial no domínio declarado'],
        notUsableFor: ['orientação individual ou aprovação profissional'],
        limitations: ['classificação inicial exige revisão periódica'],
        lastCheckedAt: source.accessedAt,
      };
      await writeFile(path.join(output, `${id}.json`), `${JSON.stringify(entry, null, 2)}\n`, 'utf8');
      known.add(source.url);
      created += 1;
    }
  }
}
console.log(`Base de referências sincronizada: ${created} registro(s) criado(s), ${known.size} URL(s) centralizada(s).`);
