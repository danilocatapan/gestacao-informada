import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const contentRoot = path.join(root, 'src', 'content');
const sensitiveTerms = ['mg', 'ml', 'dose', 'dosagem', 'tomar', 'prescrever', 'heparina', 'enoxaparina', 'AAS', 'aspirina', 'tratamento indicado', 'garante', 'cura'];
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const termRegex = (term) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(term)}(?![\\p{L}\\p{N}])`, 'giu');

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? filesIn(path.join(directory, entry.name)) : path.join(directory, entry.name))))
    .flat()
    .filter((file) => /\.(md|mdx)$/i.test(file));
}

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  return match ? { frontmatter: match[1], body: match[2] } : { frontmatter: '', body: source };
}

const value = (frontmatter, key) => frontmatter.match(new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]+)`, 'm'))?.[1]?.trim();
const reviewedTerms = (frontmatter) => [...frontmatter.matchAll(/^\s*-\s*term:\s*["']?([^"'\r\n]+)/gm)].map((match) => match[1].trim().toLocaleLowerCase('pt-BR'));
const failures = [];
const files = await filesIn(contentRoot);
const publicCollections = ['pages', 'articles', 'legal'];

for (const file of files) {
  const relative = path.relative(root, file);
  const source = await readFile(file, 'utf8');
  const { frontmatter, body } = parseFrontmatter(source);
  const collection = path.relative(contentRoot, file).split(path.sep)[0];
  if (publicCollections.includes(collection)) {
    for (const required of ['contentType', 'clinical', 'status']) {
      if (!value(frontmatter, required)) failures.push(`${relative}: conteúdo exige ${required}.`);
    }
  }

  const isApproved = value(frontmatter, 'status') === 'approved';
  const isClinical = value(frontmatter, 'clinical') === 'true';
  const isPublic = isApproved && publicCollections.includes(collection);
  if (!isPublic) continue;

  if (isClinical && collection !== 'articles') {
    failures.push(`${relative}: conteúdo clínico aprovado deve residir na collection articles.`);
  }

  const exceptions = reviewedTerms(frontmatter);
  for (const term of sensitiveTerms) {
    if (termRegex(term).test(body) && !exceptions.includes(term.toLocaleLowerCase('pt-BR'))) failures.push(`${relative}: termo sensível "${term}" exige safetyReview.`);
  }

  if (collection === 'articles' && isClinical) {
    for (const required of ['objective', 'audience', 'authoredBy', 'reviewedBy', 'reviewedAt', 'medicalDisclaimer', 'lastUpdatedAt']) {
      if (!value(frontmatter, required)) failures.push(`${relative}: conteúdo clínico aprovado exige ${required}.`);
    }
    if (!/^sources:\s*\n\s*-/m.test(frontmatter)) failures.push(`${relative}: conteúdo clínico aprovado exige ao menos uma fonte.`);
  }

  if (collection === 'legal') {
    for (const required of ['reviewedBy', 'reviewedAt']) {
      if (!value(frontmatter, required)) failures.push(`${relative}: documento jurídico aprovado exige ${required}.`);
    }
  }
}

if (failures.length) {
  console.error(`Validação editorial falhou:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`Validação editorial concluída em ${files.length} arquivos.`);
