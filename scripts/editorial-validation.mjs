import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

export const statuses = ['draft', 'in_review', 'approved', 'archived'];
export const domains = ['clinical', 'psychological', 'legal'];
export const requiredLegalDocuments = new Map([
  ['legal/privacidade', 'privacidade'],
  ['legal/termos-de-uso', 'termos'],
  ['legal/politica-editorial', 'politica-editorial'],
]);
export const sensitiveTermGroups = {
  medicationOrDose: ['mg', 'ml', 'dose', 'dosagem', 'tomar', 'prescrever', 'heparina', 'enoxaparina', 'AAS', 'aspirina'],
  prescriptionOrPromise: ['tratamento indicado', 'garante', 'cura'],
};

const forbiddenPlaceholderPattern = /\b(?:TODO|FIXME|placeholder|revisar depois|fonte pendente)\b/iu;
const forbiddenPromisePattern = /\b(?:garante|cura|prevenção garantida)\b/iu;
const sensitiveTerms = Object.values(sensitiveTermGroups).flat();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const termRegex = (term) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(term)}(?![\\p{L}\\p{N}])`, 'iu');
const hasOwn = (object, property) => Object.prototype.hasOwnProperty.call(object, property);

async function filesIn(directory, extensions) {
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? filesIn(path.join(directory, entry.name), extensions)
    : path.join(directory, entry.name))))
    .flat()
    .filter((file) => extensions.some((extension) => file.endsWith(extension)));
}

function parseMarkdown(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: source };
  return { data: parseYaml(match[1]) ?? {}, body: match[2] };
}

export function validateLegalInventory(contents) {
  const failures = [];
  const legalDocuments = contents.filter((content) => content.collection === 'legal');
  const legalMap = new Map(legalDocuments.map((document) => [document.id, document]));
  for (const [id, publicSlug] of requiredLegalDocuments) {
    const document = legalMap.get(id);
    if (!document) failures.push(`${id}: documento jurídico obrigatório ausente.`);
    else if (document.data.status === 'approved' && document.data.slug !== publicSlug) {
      failures.push(`${id}: documento aprovado deve usar o slug público "${publicSlug}".`);
    }
  }
  const approvedSlugs = legalDocuments
    .filter((document) => document.data.status === 'approved' && document.data.slug)
    .map((document) => document.data.slug);
  if (new Set(approvedSlugs).size !== approvedSlugs.length) failures.push('legal: documentos aprovados não podem compartilhar slug público.');
  return failures;
}

export function validateGlossaryInventory(contents) {
  const failures = [];
  const glossaryEntries = contents.filter((content) => content.collection === 'glossary');
  const glossaryMap = new Map(glossaryEntries.map((entry) => [entry.id, entry]));
  const slugs = glossaryEntries.map((entry) => entry.data.slug);
  if (new Set(slugs).size !== slugs.length) failures.push('glossary: termos não podem compartilhar slug público.');
  for (const entry of glossaryEntries) {
    const relatedTerms = entry.data.relatedTerms ?? [];
    if (new Set(relatedTerms).size !== relatedTerms.length) failures.push(`${entry.id}: relatedTerms não pode conter termos duplicados.`);
    for (const relatedTerm of relatedTerms) {
      const target = glossaryMap.get(`glossary/${relatedTerm}`);
      if (!target) failures.push(`${entry.id}: relatedTerms referencia termo inexistente: ${relatedTerm}.`);
      if (target?.id === entry.id) failures.push(`${entry.id}: relatedTerms não pode referenciar o próprio termo.`);
      if (entry.data.status === 'approved' && target?.data.status !== 'approved') {
        failures.push(`${entry.id}: termo aprovado só pode relacionar termos approved.`);
      }
    }
  }
  return failures;
}

export function validateReferenceInventory(contents, references = []) {
  const failures = [];
  const byUrl = new Map();
  for (const reference of references) {
    if (byUrl.has(reference.url)) failures.push(`references: URL duplicada: ${reference.url}.`);
    byUrl.set(reference.url, reference);
  }
  for (const content of contents) {
    for (const source of content.data.sources ?? []) {
      const reference = byUrl.get(source.url);
      if (!reference) failures.push(`${content.id}: fonte não centralizada em references: ${source.url}.`);
      if (content.data.status === 'approved' && reference?.authorityLevel === 'low') {
        failures.push(`${content.id}: conteúdo aprovado não pode depender de fonte de autoridade low.`);
      }
    }
  }
  return failures;
}

export function validateEditorialState({ contents, contributors = [], reviews = [] }) {
  const failures = [];
  const contributorIds = new Set(contributors.map((contributor) => contributor.id));
  const reviewMap = new Map(reviews.map((review) => [review.target, review]));

  for (const content of contents) {
    const { data } = content;
    const label = content.id;
    const riskDomains = Array.isArray(data.riskDomains) ? data.riskDomains : [];
    const text = [content.body, data.title, data.description, data.term, data.shortDefinition, data.fullDefinition].filter(Boolean).join('\n');
    if (!statuses.includes(data.status)) failures.push(`${label}: status editorial inválido.`);
    if (!Array.isArray(data.riskDomains)) failures.push(`${label}: conteúdo exige riskDomains.`);
    if (new Set(riskDomains).size !== riskDomains.length) failures.push(`${label}: riskDomains não pode conter valores duplicados.`);
    for (const domain of riskDomains) if (!domains.includes(domain)) failures.push(`${label}: domínio de risco inválido: ${domain}.`);
    if (data.clinical === true && !['articles', 'glossary'].includes(content.collection)) failures.push(`${label}: conteúdo clínico deve residir em articles ou glossary.`);
    if (data.clinical === true && !riskDomains.includes('clinical')) failures.push(`${label}: conteúdo clínico deve declarar o domínio clinical.`);
    if (content.collection === 'legal' && !riskDomains.includes('legal')) failures.push(`${label}: documento jurídico deve declarar o domínio legal.`);
    if (content.collection === 'legal' && (hasOwn(data, 'reviewer') || hasOwn(data, 'reviewedAt'))) failures.push(`${label}: campos de revisão profissional não pertencem ao fluxo simplificado.`);
    if (content.collection === 'glossary' && (hasOwn(data, 'reviewer') || hasOwn(data, 'reviewedAt'))) failures.push(`${label}: campos de revisão profissional não pertencem ao fluxo simplificado.`);
    if (data.authoredBy && !contributorIds.has(data.authoredBy)) failures.push(`${label}: autoria referencia perfil inexistente.`);
    if (data.status !== 'approved') continue;
    if (forbiddenPlaceholderPattern.test(text)) failures.push(`${label}: placeholder editorial não permitido.`);
    if (forbiddenPromisePattern.test(text)) failures.push(`${label}: promessa de resultado não permitida.`);
    if (riskDomains.length > 0) {
      const review = reviewMap.get(label);
      if (!review || review.schemaVersion !== 2 || review.decision !== 'approved_for_publication') {
        failures.push(`${label}: publicação exige parecer editorial v2 aprovado.`);
      }
      if (review?.resultingContentHash && review.resultingContentHash !== content.contentHash) {
        failures.push(`${label}: parecer editorial não corresponde à versão atual.`);
      }
    }
    if (['articles', 'glossary'].includes(content.collection) || data.contentType === 'legal-guide') {
      if (!data.authoredBy) failures.push(`${label}: conteúdo aprovado exige autoria.`);
      if (!Array.isArray(data.sources) || data.sources.length === 0) failures.push(`${label}: conteúdo aprovado exige ao menos uma fonte.`);
    }
    const exceptions = (data.safetyReview ?? []).map((item) => String(item.term).toLocaleLowerCase('pt-BR'));
    for (const term of sensitiveTerms) {
      if (termRegex(term).test(text) && !exceptions.includes(term.toLocaleLowerCase('pt-BR'))) {
        failures.push(`${label}: termo sensível "${term}" exige auditoria documentada em safetyReview.`);
      }
    }
    if (content.collection === 'articles' && riskDomains.includes('clinical') && !data.medicalDisclaimer) failures.push(`${label}: artigo clínico aprovado exige disclaimer médico.`);
    if (data.contentType === 'legal-guide' && !data.legalDisclaimer) failures.push(`${label}: guia jurídico aprovado exige disclaimer jurídico.`);
  }
  return [...new Set(failures)];
}

export async function loadEditorialState(root = process.cwd()) {
  const contentRoot = path.join(root, 'src', 'content');
  const contents = [];
  for (const collection of ['pages', 'articles', 'glossary', 'legal']) {
    for (const file of await filesIn(path.join(contentRoot, collection), ['.md', '.mdx'])) {
      const source = await readFile(file, 'utf8');
      const { data, body } = parseMarkdown(source);
      contents.push({
        id: `${collection}/${path.basename(file).replace(/\.(md|mdx)$/i, '')}`,
        collection,
        data,
        body,
        contentHash: (await import('node:crypto')).createHash('sha256').update(source).digest('hex'),
      });
    }
  }
  const contributors = [];
  for (const file of await filesIn(path.join(contentRoot, 'contributors'), ['.json', '.yaml', '.yml'])) {
    const source = await readFile(file, 'utf8');
    contributors.push({ id: path.basename(file).replace(/\.(json|yaml|yml)$/i, ''), ...(file.endsWith('.json') ? JSON.parse(source) : parseYaml(source)) });
  }
  const references = [];
  for (const file of await filesIn(path.join(contentRoot, 'references'), ['.json', '.yaml', '.yml'])) {
    const source = await readFile(file, 'utf8');
    references.push(file.endsWith('.json') ? JSON.parse(source) : parseYaml(source));
  }
  const reviews = [];
  for (const file of await filesIn(path.join(root, 'docs', 'editorial-reviews'), ['.json'])) {
    reviews.push(JSON.parse(await readFile(file, 'utf8')));
  }
  return { contents, contributors, references, reviews };
}
