import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export const REVIEW_STATES = ['pending', 'ready_for_human_review', 'needs_changes', 'blocked'];
export const FINDING_SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const CONTENT_COLLECTIONS = ['articles', 'glossary', 'legal', 'pages'];
const placeholderPattern = /\b(?:TODO|FIXME|placeholder|revisar depois|fonte pendente)\b/giu;
const placeholderTestPattern = /\b(?:TODO|FIXME|placeholder|revisar depois|fonte pendente)\b/iu;
const pendingHumanReviewPattern = /\bpendência humana\b/giu;
const unsafePatterns = [
  { pattern: /\b(?:garante|cura|prevenção garantida)\b/giu, domain: 'clinical', severity: 'critical', rationale: 'Promessas de resultado não são permitidas.' },
  { pattern: /\b(?:tome|use|inicie|suspenda)\s+(?:o|a|um|uma)?\s*\w+/giu, domain: 'clinical', severity: 'critical', rationale: 'Possível orientação individual ou prescritiva.' },
  { pattern: /\bsubstitui\s+(?:o|a|um|uma)?\s*(?:médico|psicólogo|advogado|serviço de emergência)\b/giu, domain: 'editorial', severity: 'critical', rationale: 'O portal não pode declarar substituição de profissional habilitado.' },
];

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const reviewFileName = (target) => `${target.replace('/', '--')}.json`;

export function parseMarkdown(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error('Conteúdo Markdown exige frontmatter YAML.');
  return { data: parseYaml(match[1]) ?? {}, body: match[2], source };
}

export function serializeMarkdown(data, body) {
  return `---\n${stringifyYaml(data, { lineWidth: 0 }).trimEnd()}\n---\n${body}`;
}

export function normalizeTarget(target) {
  const normalized = String(target ?? '').replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
  const [collection, id, ...extra] = normalized.split('/');
  if (!CONTENT_COLLECTIONS.includes(collection) || !id || extra.length) {
    throw new Error('Alvo inválido. Use <collection>/<id>.');
  }
  return `${collection}/${id}`;
}

export function contentPath(root, target) {
  const [collection, id] = normalizeTarget(target).split('/');
  return path.join(root, 'src', 'content', collection, `${id}.md`);
}

export async function readContent(root, target) {
  const normalized = normalizeTarget(target);
  const file = contentPath(root, normalized);
  const source = await readFile(file, 'utf8');
  return { target: normalized, file, ...parseMarkdown(source), contentHash: sha256(source) };
}

function exactFinding({ target, body, match, domain, severity, rationale, suggestedReplacement = '', relatedSources = [] }) {
  const exactText = match[0];
  const before = body.slice(0, match.index);
  const line = before.split(/\r?\n/).length;
  return {
    id: sha256(`${target}:${match.index}:${exactText}:${rationale}`).slice(0, 16),
    domain,
    severity,
    exactText,
    occurrence: [...body.matchAll(new RegExp(exactText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gu'))]
      .findIndex((candidate) => candidate.index === match.index) + 1,
    line,
    rationale,
    suggestedReplacement,
    relatedSources,
    resolution: { status: 'pending', replacement: '', justification: '' },
  };
}

export function analyzeContent(content) {
  const findings = [];
  const metadataText = [content.data.title, content.data.description, content.data.objective]
    .filter(Boolean).join('\n');
  if (placeholderTestPattern.test(metadataText)) {
    findings.push({
      id: sha256(`${content.target}:metadata-placeholder`).slice(0, 16),
      domain: 'editorial', severity: 'high', exactText: '', occurrence: 0, line: 0,
      rationale: 'O frontmatter contém placeholder editorial e precisa ser corrigido diretamente no arquivo.',
      suggestedReplacement: '', relatedSources: [],
      resolution: { status: 'pending', replacement: '', justification: '' },
    });
  }
  for (const match of content.body.matchAll(placeholderPattern)) {
    findings.push(exactFinding({
      target: content.target, body: content.body, match, domain: 'editorial', severity: 'high',
      rationale: 'Placeholder editorial precisa ser resolvido antes da revisão.',
    }));
  }
  for (const match of content.body.matchAll(pendingHumanReviewPattern)) {
    findings.push(exactFinding({
      target: content.target, body: content.body, match, domain: 'editorial', severity: 'medium',
      rationale: 'O texto declara uma pendência humana que precisa ser confirmada antes da publicação.',
      suggestedReplacement: match[0],
    }));
  }
  for (const rule of unsafePatterns) {
    for (const match of content.body.matchAll(rule.pattern)) {
      findings.push(exactFinding({ target: content.target, body: content.body, match, ...rule }));
    }
  }
  const riskDomains = content.data.riskDomains ?? [];
  if (riskDomains.includes('clinical') && !content.data.medicalDisclaimer && content.target.startsWith('articles/')) {
    findings.push({
      id: sha256(`${content.target}:medicalDisclaimer`).slice(0, 16),
      domain: 'clinical', severity: 'high', exactText: '', occurrence: 0, line: 0,
      rationale: 'Conteúdo clínico exige disclaimer médico.', suggestedReplacement: '', relatedSources: [],
      resolution: { status: 'pending', replacement: '', justification: '' },
    });
  }
  if (riskDomains.includes('legal') && content.data.contentType === 'legal-guide' && !content.data.legalDisclaimer) {
    findings.push({
      id: sha256(`${content.target}:legalDisclaimer`).slice(0, 16),
      domain: 'legal', severity: 'high', exactText: '', occurrence: 0, line: 0,
      rationale: 'Guia jurídico exige disclaimer jurídico.', suggestedReplacement: '', relatedSources: [],
      resolution: { status: 'pending', replacement: '', justification: '' },
    });
  }
  const critical = findings.some((finding) => finding.severity === 'critical');
  return {
    state: critical ? 'blocked' : findings.length ? 'needs_changes' : 'ready_for_human_review',
    findings,
  };
}

export async function generateReview(root, target) {
  const content = await readContent(root, target);
  const analysis = analyzeContent(content);
  const now = new Date().toISOString();
  const review = {
    schemaVersion: 1,
    id: randomUUID(),
    target: content.target,
    generatedAt: now,
    updatedAt: now,
    contentHash: content.contentHash,
    contentStatus: content.data.status,
    riskDomains: content.data.riskDomains ?? [],
    decision: analysis.state,
    publicationAllowed: false,
    summary: analysis.findings.length
      ? `${analysis.findings.length} apontamento(s) exigem decisão.`
      : 'Gates automatizados íntegros; conteúdo apto para avaliação humana.',
    agents: {
      research: 'pending_assisted_execution',
      challenge: analysis.state,
      editorial: analysis.findings.length ? 'suggestions_available' : 'no_changes',
      aiApproval: analysis.state,
      publication: 'blocked_until_human_gates',
    },
    findings: analysis.findings,
    history: [{ occurredAt: now, action: 'review_generated', actor: 'editorial-pipeline' }],
  };
  const directory = path.join(root, 'docs', 'editorial-reviews');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, reviewFileName(content.target)), `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  return review;
}

export async function listReviews(root) {
  const directory = path.join(root, 'docs', 'editorial-reviews');
  let files = [];
  try { files = await readdir(directory); } catch { return []; }
  const reviews = await Promise.all(files.filter((file) => file.endsWith('.json')).map(async (file) =>
    JSON.parse(await readFile(path.join(directory, file), 'utf8'))));
  return reviews.sort((left, right) => left.target.localeCompare(right.target, 'pt-BR'));
}

export async function readReview(root, target) {
  const file = path.join(root, 'docs', 'editorial-reviews', reviewFileName(normalizeTarget(target)));
  return { file, review: JSON.parse(await readFile(file, 'utf8')) };
}

function replaceOccurrence(body, exactText, occurrence, replacement) {
  if (!exactText) throw new Error('Apontamento sem trecho exato não pode ser aplicado automaticamente.');
  let seen = 0;
  let replaced = false;
  const result = body.replaceAll(exactText, (match) => {
    seen += 1;
    if (seen !== occurrence) return match;
    replaced = true;
    return replacement;
  });
  if (!replaced) throw new Error(`Trecho não encontrado na ocorrência ${occurrence}.`);
  return result;
}

export function validateReviewForApply(content, review) {
  if (content.contentHash !== review.contentHash) throw new Error('O conteúdo mudou após a geração do parecer. Gere uma nova revisão.');
  const unresolved = review.findings.filter((finding) => finding.resolution?.status === 'pending');
  if (unresolved.length) throw new Error('Todos os apontamentos precisam ser resolvidos.');
  const blockingRejected = review.findings.some((finding) =>
    ['high', 'critical'].includes(finding.severity) && finding.resolution?.status !== 'accepted');
  if (blockingRejected) throw new Error('Apontamentos altos ou críticos precisam ser corrigidos antes do envio.');
}

export function applyAcceptedFindings(body, findings) {
  return findings
    .filter((finding) => finding.resolution?.status === 'accepted')
    .sort((left, right) => right.line - left.line)
    .reduce((current, finding) =>
      replaceOccurrence(current, finding.exactText, finding.occurrence, finding.resolution.replacement), body);
}

export async function saveReviewResolution(root, target, findingId, resolution, actor = 'local-maintainer') {
  const { file, review } = await readReview(root, target);
  const finding = review.findings.find((item) => item.id === findingId);
  if (!finding) throw new Error('Apontamento inexistente.');
  if (!['accepted', 'rejected'].includes(resolution.status)) throw new Error('Resolução inválida.');
  if (resolution.status === 'accepted' && typeof resolution.replacement !== 'string') throw new Error('Substituição inválida.');
  if (resolution.status === 'rejected' && String(resolution.justification ?? '').trim().length < 10) {
    throw new Error('Rejeição exige justificativa com ao menos 10 caracteres.');
  }
  finding.resolution = {
    status: resolution.status,
    replacement: resolution.status === 'accepted' ? resolution.replacement : '',
    justification: String(resolution.justification ?? '').trim(),
  };
  review.updatedAt = new Date().toISOString();
  review.history.push({ occurredAt: review.updatedAt, action: `finding_${resolution.status}`, actor, findingId });
  await writeFile(file, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  return review;
}

async function writeEditorialRecord(root, record) {
  const directory = path.join(root, 'src', 'content', 'editorial-records');
  await mkdir(directory, { recursive: true });
  const name = `${record.occurredAt.replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z')}--${record.target.replace('/', '--')}--${record.event}.json`;
  await writeFile(path.join(directory, name), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}

export async function applyReview(root, target, actor = 'equipe-editorial') {
  const content = await readContent(root, target);
  const { file: reviewFile, review } = await readReview(root, target);
  validateReviewForApply(content, review);
  const body = applyAcceptedFindings(content.body, review.findings);
  const now = new Date().toISOString();
  const previousStatus = content.data.status;
  const changed = body !== content.body;
  const nextStatus = previousStatus === 'approved' ? 'draft' : 'in_review';
  const data = { ...content.data };
  if (changed || previousStatus === 'approved') data.status = 'draft';
  if (nextStatus === 'in_review') data.status = 'in_review';
  if ('lastUpdatedAt' in data) data.lastUpdatedAt = now;
  if ('updatedAt' in data) data.updatedAt = now;
  const source = serializeMarkdown(data, body);
  await writeFile(content.file, source, 'utf8');
  const contentUpdatedAt = data.lastUpdatedAt ?? data.updatedAt;
  if (nextStatus === 'in_review') {
    await writeEditorialRecord(root, {
      target: content.target,
      event: 'submitted_for_review',
      actor,
      role: 'author',
      occurredAt: now,
      contentUpdatedAt,
      justification: 'Conteúdo submetido pelo painel editorial local após resolução dos apontamentos automatizados.',
    });
    if (previousStatus === 'draft') {
      await writeEditorialRecord(root, {
        target: content.target,
        event: 'status_transition',
        actor,
        role: 'author',
        occurredAt: now,
        contentUpdatedAt,
        fromStatus: 'draft',
        toStatus: 'in_review',
        justification: 'Transição registrada pelo painel local após conclusão da triagem automatizada.',
      });
    }
  }
  review.updatedAt = now;
  review.appliedAt = now;
  review.appliedBy = actor;
  review.resultingStatus = data.status;
  review.resultingContentHash = sha256(source);
  review.history.push({ occurredAt: now, action: 'changes_applied_and_submitted', actor });
  await writeFile(reviewFile, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  return { target: content.target, status: data.status, changed };
}

export async function markDraft(root, target, reason, actor = 'equipe-editorial') {
  if (String(reason ?? '').trim().length < 10) throw new Error('Informe um motivo com ao menos 10 caracteres.');
  const content = await readContent(root, target);
  if (!['approved', 'in_review'].includes(content.data.status)) throw new Error('Somente conteúdo approved ou in_review pode retornar para draft.');
  const now = new Date().toISOString();
  const data = { ...content.data, status: 'draft' };
  const updatedAt = data.lastUpdatedAt ?? data.updatedAt;
  await writeFile(content.file, serializeMarkdown(data, content.body), 'utf8');
  await writeEditorialRecord(root, {
    target: content.target, event: 'status_transition', actor, role: 'author',
    occurredAt: now, contentUpdatedAt: updatedAt, fromStatus: content.data.status, toStatus: 'draft',
    justification: String(reason).trim(),
  });
  return { target: content.target, status: 'draft' };
}

export async function listContentTargets(root) {
  const targets = [];
  for (const collection of CONTENT_COLLECTIONS) {
    const directory = path.join(root, 'src', 'content', collection);
    for (const file of await readdir(directory)) {
      if (file.endsWith('.md')) targets.push(`${collection}/${file.replace(/\.md$/i, '')}`);
    }
  }
  return targets.sort((left, right) => left.localeCompare(right, 'pt-BR'));
}
