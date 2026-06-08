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
const roleForDomain = {
  clinical: 'clinical_reviewer',
  psychological: 'psychological_reviewer',
  legal: 'legal_reviewer',
};
const allowedTransitions = new Set([
  'draft:in_review',
  'in_review:draft',
  'in_review:approved',
  'approved:draft',
  'approved:archived',
  'archived:draft',
]);
export const sensitiveTermGroups = {
  medicationOrDose: ['mg', 'ml', 'dose', 'dosagem', 'tomar', 'prescrever', 'heparina', 'enoxaparina', 'AAS', 'aspirina'],
  prescriptionOrPromise: ['tratamento indicado', 'garante', 'cura'],
};
const sensitiveTerms = Object.values(sensitiveTermGroups).flat();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const termRegex = (term) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(term)}(?![\\p{L}\\p{N}])`, 'giu');

async function filesIn(directory, extensions) {
  const entries = await readdir(directory, { withFileTypes: true });
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

const sameTime = (left, right) => new Date(left).getTime() === new Date(right).getTime();
const atOrAfter = (left, right) => new Date(left).getTime() >= new Date(right).getTime();
const recordActors = (records) => records.map((record) => record.actor);
const hasOwn = (object, property) => Object.prototype.hasOwnProperty.call(object, property);

export function validateLegalInventory(contents) {
  const failures = [];
  const legalDocuments = contents.filter((content) => content.collection === 'legal');
  const legalMap = new Map(legalDocuments.map((document) => [document.id, document]));

  for (const [id, publicSlug] of requiredLegalDocuments) {
    const document = legalMap.get(id);
    if (!document) {
      failures.push(`${id}: documento jurídico obrigatório ausente.`);
    } else if (document.data.status === 'approved' && document.data.slug !== publicSlug) {
      failures.push(`${id}: documento aprovado deve usar o slug público "${publicSlug}".`);
    }
  }

  const approvedSlugs = legalDocuments
    .filter((document) => document.data.status === 'approved' && document.data.slug)
    .map((document) => document.data.slug);
  if (new Set(approvedSlugs).size !== approvedSlugs.length) failures.push('legal: documentos aprovados não podem compartilhar slug público.');

  return failures;
}

export function validateEditorialState({ contents, contributors, records }) {
  const failures = [];
  const contributorMap = new Map(contributors.map((contributor) => [contributor.id, contributor]));
  const contentMap = new Map(contents.map((content) => [content.id, content]));

  for (const contributor of contributors) {
    if (!Array.isArray(contributor.editorialRoles) || contributor.editorialRoles.length === 0) failures.push(`${contributor.id}: participante exige editorialRoles.`);
    if (!contributor.credentials || !String(contributor.credentials).trim()) failures.push(`${contributor.id}: participante exige credenciais registradas.`);
  }

  for (const record of records) {
    const label = record.target ?? 'registro sem alvo';
    const contributor = contributorMap.get(record.actor);
    if (!record.occurredAt || !record.contentUpdatedAt) failures.push(`${label}: registro exige occurredAt e contentUpdatedAt.`);
    if (!record.justification || String(record.justification).trim().length < 20) failures.push(`${label}: registro exige justificativa auditável.`);
    if (!contentMap.has(record.target)) failures.push(`${label}: registro referencia conteúdo inexistente.`);
    if (!contributor) {
      failures.push(`${label}: registro referencia participante inexistente: ${record.actor}.`);
    } else if (!contributor.editorialRoles?.includes(record.role)) {
      failures.push(`${label}: ${record.actor} não possui o papel ${record.role}.`);
    }
    if (record.event === 'submitted_for_review' && record.role !== 'author') failures.push(`${label}: submissão para revisão exige papel de autor.`);
    if (record.event === 'domain_review') {
      if (!record.domain || !record.decision) failures.push(`${label}: revisão de domínio exige domain e decision.`);
      if (record.role !== roleForDomain[record.domain]) failures.push(`${label}: revisão ${record.domain} exige o papel ${roleForDomain[record.domain]}.`);
    }
    if (record.event === 'editorial_approval' && (record.role !== 'editorial_approver' || !record.decision)) {
      failures.push(`${label}: aprovação editorial exige papel editorial_approver e decision.`);
    }
    if (record.event === 'status_transition') {
      if (!record.fromStatus || !record.toStatus || !allowedTransitions.has(`${record.fromStatus}:${record.toStatus}`)) {
        failures.push(`${label}: transição editorial inválida.`);
      }
    }
  }

  for (const content of contents) {
    const label = content.id;
    const data = content.data;
    const riskDomains = Array.isArray(data.riskDomains) ? data.riskDomains : [];
    const contentRecords = records.filter((record) => record.target === content.id);

    if (!statuses.includes(data.status)) failures.push(`${label}: status editorial inválido.`);
    if (!Array.isArray(data.riskDomains)) failures.push(`${label}: conteúdo exige riskDomains.`);
    if (new Set(riskDomains).size !== riskDomains.length) failures.push(`${label}: riskDomains não pode conter valores duplicados.`);
    for (const domain of riskDomains) {
      if (!domains.includes(domain)) failures.push(`${label}: domínio de risco inválido: ${domain}.`);
    }
    if (data.clinical === true && content.collection !== 'articles') failures.push(`${label}: conteúdo clínico deve residir em articles.`);
    if (data.clinical === true && !riskDomains.includes('clinical')) failures.push(`${label}: conteúdo clínico deve declarar o domínio clinical.`);
    if (content.collection === 'legal') {
      if (!riskDomains.includes('legal')) failures.push(`${label}: documento jurídico deve declarar o domínio legal.`);
      if (!hasOwn(data, 'reviewer')) failures.push(`${label}: documento jurídico exige o campo reviewer, mesmo quando nulo.`);
      if (!hasOwn(data, 'reviewedAt')) failures.push(`${label}: documento jurídico exige o campo reviewedAt, mesmo quando nulo.`);
      if (data.reviewedAt && !data.reviewer) failures.push(`${label}: reviewedAt exige reviewer identificado.`);
      if (data.status !== 'approved' && data.slug) failures.push(`${label}: documento jurídico não aprovado não pode declarar slug público.`);
      if (data.status === 'approved') {
        if (!data.slug) failures.push(`${label}: documento jurídico aprovado exige slug público.`);
        if (!data.reviewer) failures.push(`${label}: documento jurídico aprovado exige reviewer.`);
        if (!data.reviewedAt) failures.push(`${label}: documento jurídico aprovado exige reviewedAt.`);
      }
      if (data.legalBasis !== undefined
        && !(typeof data.legalBasis === 'string' && data.legalBasis.trim())
        && !(Array.isArray(data.legalBasis) && data.legalBasis.length > 0 && data.legalBasis.every((item) => typeof item === 'string' && item.trim()))) {
        failures.push(`${label}: legalBasis deve ser texto ou lista não vazia quando informado.`);
      }
    }

    if (data.status !== 'approved') continue;

    const exceptions = (data.safetyReview ?? []).map((review) => String(review.term).toLocaleLowerCase('pt-BR'));
    for (const term of sensitiveTerms) {
      if (termRegex(term).test(content.body) && !exceptions.includes(term.toLocaleLowerCase('pt-BR'))) {
        failures.push(`${label}: termo sensível "${term}" exige safetyReview.`);
      }
    }

    const governed = content.collection === 'articles' || content.collection === 'legal' || riskDomains.length > 0;
    if (!governed) continue;

    const updatedAt = data.lastUpdatedAt ?? data.updatedAt;
    if (!updatedAt) failures.push(`${label}: conteúdo aprovado exige data de atualização.`);
    if (content.collection === 'articles') {
      if (!data.authoredBy) failures.push(`${label}: artigo aprovado exige autoria.`);
      const author = contributorMap.get(data.authoredBy);
      if (data.authoredBy && (!author || !author.editorialRoles?.includes('author'))) failures.push(`${label}: autoria deve referenciar participante autorizado como author.`);
      if (!Array.isArray(data.sources) || data.sources.length === 0) failures.push(`${label}: artigo aprovado exige ao menos uma fonte.`);
      if (!data.medicalDisclaimer || !String(data.medicalDisclaimer).trim()) failures.push(`${label}: artigo aprovado exige medicalDisclaimer.`);
      if (!data.aiAssistance?.activities?.length || !data.aiAssistance?.disclosure) failures.push(`${label}: artigo aprovado exige transparência sobre assistência por IA.`);
    }

    const submission = contentRecords.find((record) => record.event === 'submitted_for_review' && atOrAfter(record.occurredAt, updatedAt));
    if (!submission) failures.push(`${label}: aprovação exige submissão para revisão posterior à última atualização.`);

    const transition = contentRecords.find((record) => record.event === 'status_transition'
      && record.fromStatus === 'in_review'
      && record.toStatus === 'approved'
      && atOrAfter(record.occurredAt, updatedAt));
    if (!transition) failures.push(`${label}: aprovação exige transição registrada de in_review para approved.`);

    const editorialApprovals = contentRecords
      .filter((record) => record.event === 'editorial_approval')
      .sort((left, right) => new Date(left.occurredAt) - new Date(right.occurredAt));
    const editorialApproval = editorialApprovals.at(-1);
    if (!editorialApproval || editorialApproval.decision !== 'approved' || !atOrAfter(editorialApproval.occurredAt, updatedAt)) {
      failures.push(`${label}: aprovação editorial válida e atualizada é obrigatória.`);
    }

    const requiredRecords = [submission, editorialApproval, transition].filter(Boolean);
    for (const domain of riskDomains) {
      const reviews = contentRecords
        .filter((record) => record.event === 'domain_review' && record.domain === domain)
        .sort((left, right) => new Date(left.occurredAt) - new Date(right.occurredAt));
      const latest = reviews.at(-1);
      if (!latest || latest.decision !== 'approved' || !atOrAfter(latest.occurredAt, updatedAt)) {
        failures.push(`${label}: revisão ${domain} aprovada e atualizada é obrigatória.`);
      } else {
        requiredRecords.push(latest);
      }
    }

    if (content.collection === 'legal' && data.reviewer && data.reviewedAt) {
      const reviewer = contributorMap.get(data.reviewer);
      if (!reviewer || !reviewer.editorialRoles?.includes('legal_reviewer')) {
        failures.push(`${label}: reviewer deve referenciar participante autorizado como legal_reviewer.`);
      }
      const latestLegalReview = contentRecords
        .filter((record) => record.event === 'domain_review' && record.domain === 'legal')
        .sort((left, right) => new Date(left.occurredAt) - new Date(right.occurredAt))
        .at(-1);
      if (latestLegalReview && (latestLegalReview.actor !== data.reviewer || !sameTime(latestLegalReview.occurredAt, data.reviewedAt))) {
        failures.push(`${label}: reviewer e reviewedAt devem corresponder à revisão legal aprovada mais recente.`);
      }
    }

    const decisionRecords = [editorialApproval, ...riskDomains.map((domain) => contentRecords
      .filter((record) => record.event === 'domain_review' && record.domain === domain)
      .sort((left, right) => new Date(left.occurredAt) - new Date(right.occurredAt))
      .at(-1))].filter(Boolean);
    const actors = [data.authoredBy, ...recordActors(decisionRecords)].filter(Boolean);
    if (new Set(actors).size !== actors.length) failures.push(`${label}: autor, revisores e aprovador editorial devem ser distintos.`);

    for (const record of requiredRecords) {
      if (updatedAt && !sameTime(record.contentUpdatedAt, updatedAt)) failures.push(`${label}: registro ${record.event} não corresponde à versão atual do conteúdo.`);
    }
  }

  return [...new Set(failures)];
}

export async function loadEditorialState(root = process.cwd()) {
  const contentRoot = path.join(root, 'src', 'content');
  const contents = [];
  for (const collection of ['pages', 'articles', 'legal']) {
    for (const file of await filesIn(path.join(contentRoot, collection), ['.md', '.mdx'])) {
      const { data, body } = parseMarkdown(await readFile(file, 'utf8'));
      contents.push({
        id: `${collection}/${path.basename(file).replace(/\.(md|mdx)$/i, '')}`,
        collection,
        data,
        body,
      });
    }
  }

  const contributors = [];
  for (const file of await filesIn(path.join(contentRoot, 'contributors'), ['.json', '.yaml', '.yml'])) {
    const source = await readFile(file, 'utf8');
    contributors.push({
      id: path.basename(file).replace(/\.(json|yaml|yml)$/i, ''),
      ...(file.endsWith('.json') ? JSON.parse(source) : parseYaml(source)),
    });
  }

  const records = [];
  const recordsRoot = path.join(contentRoot, 'editorial-records');
  for (const file of await filesIn(recordsRoot, ['.json', '.yaml', '.yml'])) {
    const source = await readFile(file, 'utf8');
    records.push(file.endsWith('.json') ? JSON.parse(source) : parseYaml(source));
  }
  return { contents, contributors, records };
}
