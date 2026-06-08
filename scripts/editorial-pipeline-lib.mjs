import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export const REVIEW_DECISIONS = ['blocked', 'owner_review_required', 'approved_for_publication'];
export const FINDING_SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const CONTENT_COLLECTIONS = ['articles', 'glossary', 'legal', 'pages'];
const placeholderPattern = /\b(?:TODO|FIXME|placeholder|revisar depois|fonte pendente)\b/giu;
const pendingHumanReviewPattern = /\b(?:pendência humana|revisão profissional|aprovação profissional|aprovação editorial independente)\b/giu;
const copiedContentPattern = /\b(?:reproduzido integralmente|adaptado de|tradução integral)\b/giu;
const unsafePatterns = [
  { pattern: /\b(?:garante|cura|prevenção garantida)\b/giu, domain: 'clinical', severity: 'critical', rationale: 'Promessas de resultado não são permitidas.' },
  { pattern: /\b(?:tome|use|inicie|suspenda)\s+(?:o|a|um|uma)?\s*\w+/giu, domain: 'clinical', severity: 'critical', rationale: 'Possível orientação individual ou prescritiva.' },
  { pattern: /\b\d+(?:[.,]\d+)?\s*(?:mg|ml)\b/giu, domain: 'clinical', severity: 'critical', rationale: 'Dose medicamentosa não pode ser publicada sem aprovação clínica e jurídica explícita.' },
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
  if (!CONTENT_COLLECTIONS.includes(collection) || !id || extra.length) throw new Error('Alvo inválido. Use <collection>/<id>.');
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

function finding({ target, body, match, domain, severity, rationale, kind = 'blocker', suggestedReplacement = '' }) {
  const exactText = match?.[0] ?? '';
  const line = match ? body.slice(0, match.index).split(/\r?\n/).length : 0;
  return {
    id: sha256(`${target}:${line}:${exactText}:${rationale}`).slice(0, 16),
    kind, domain, severity, exactText, occurrence: exactText ? [...body.matchAll(new RegExp(exactText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gu'))].findIndex((item) => item.index === match.index) + 1 : 0,
    line, rationale, suggestedReplacement, relatedSources: [],
    resolution: { status: 'pending', replacement: '', justification: '' },
  };
}

export function analyzeContent(content) {
  const findings = [];
  const governed = (content.data.riskDomains ?? []).length > 0;
  const metadataText = [content.data.title, content.data.description, content.data.objective].filter(Boolean).join('\n');
  for (const match of metadataText.matchAll(placeholderPattern)) findings.push(finding({ target: content.target, body: metadataText, match, domain: 'editorial', severity: 'high', rationale: 'Metadado contém placeholder editorial.' }));
  for (const match of content.body.matchAll(placeholderPattern)) findings.push(finding({ target: content.target, body: content.body, match, domain: 'editorial', severity: 'high', rationale: 'Placeholder editorial precisa ser resolvido.' }));
  for (const match of content.body.matchAll(copiedContentPattern)) findings.push(finding({ target: content.target, body: content.body, match, domain: 'legal', severity: 'critical', rationale: 'Reprodução ou adaptação extensa exige licença ou autorização explícita.' }));
  for (const rule of unsafePatterns) for (const match of content.body.matchAll(rule.pattern)) findings.push(finding({ target: content.target, body: content.body, match, ...rule }));
  if (governed && !Array.isArray(content.data.sources)) findings.push(finding({ target: content.target, body: content.body, domain: 'sources', severity: 'critical', rationale: 'Conteúdo governado exige lista rastreável de fontes.' }));
  if (governed && ['articles', 'glossary'].some((collection) => content.target.startsWith(`${collection}/`)) && (content.data.sources ?? []).length === 0) {
    findings.push(finding({ target: content.target, body: content.body, domain: 'sources', severity: 'critical', rationale: 'Conteúdo clínico exige ao menos uma fonte rastreável.' }));
  }
  if ((content.data.riskDomains ?? []).includes('clinical') && content.target.startsWith('articles/') && !content.data.medicalDisclaimer) {
    findings.push(finding({ target: content.target, body: content.body, domain: 'clinical', severity: 'high', rationale: 'Conteúdo clínico exige disclaimer médico.' }));
  }
  if ((content.data.riskDomains ?? []).includes('legal') && content.data.contentType === 'legal-guide' && !content.data.legalDisclaimer) {
    findings.push(finding({ target: content.target, body: content.body, domain: 'legal', severity: 'high', rationale: 'Guia jurídico exige disclaimer jurídico.' }));
  }
  for (const match of content.body.matchAll(pendingHumanReviewPattern)) {
    findings.push(finding({
      target: content.target, body: content.body, match, domain: 'editorial', severity: 'medium', kind: 'escalation',
      rationale: 'O texto declara uma pendência ou aprovação profissional incompatível com o fluxo simplificado.',
      suggestedReplacement: 'auditoria editorial',
    }));
  }
  const blockers = findings.filter((item) => item.kind === 'blocker');
  const escalations = findings.filter((item) => item.kind === 'escalation');
  return {
    decision: blockers.length ? 'blocked' : escalations.length ? 'owner_review_required' : 'approved_for_publication',
    findings, blockers, escalations,
  };
}

function specialistResults(analysis) {
  const byDomain = (domain) => analysis.findings.filter((item) => item.domain === domain).map((item) => item.id);
  return {
    research: { status: analysis.blockers.some((item) => item.domain === 'sources') ? 'blocked' : 'completed', findingIds: byDomain('sources') },
    challenge: { status: analysis.blockers.length ? 'blocked' : 'completed', findingIds: analysis.blockers.map((item) => item.id) },
    editorial: { status: analysis.escalations.length ? 'escalated' : 'completed', findingIds: byDomain('editorial') },
    safetyAudit: { status: analysis.decision, findingIds: analysis.findings.filter((item) => ['clinical', 'psychological', 'legal'].includes(item.domain)).map((item) => item.id) },
  };
}

export async function generateReview(root, target) {
  const content = await readContent(root, target);
  const analysis = analyzeContent(content);
  const now = new Date().toISOString();
  const review = {
    schemaVersion: 2,
    id: randomUUID(),
    target: content.target,
    generatedAt: now,
    updatedAt: now,
    contentHash: content.contentHash,
    contentStatus: content.data.status,
    riskDomains: content.data.riskDomains ?? [],
    decision: analysis.decision,
    publicationAllowed: analysis.decision === 'approved_for_publication',
    sourceCoverage: { sourceCount: (content.data.sources ?? []).length, synthesisPolicy: 'original_traceable_synthesis', verified: analysis.blockers.every((item) => item.domain !== 'sources') },
    specialists: specialistResults(analysis),
    blockers: analysis.blockers.map((item) => item.id),
    escalations: analysis.escalations.map((item) => item.id),
    ownerApproval: null,
    findings: analysis.findings,
    history: [{ occurredAt: now, action: 'review_v2_generated', actor: 'codex-editorial-orchestrator' }],
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
  const reviews = await Promise.all(files.filter((file) => file.endsWith('.json')).map(async (file) => JSON.parse(await readFile(path.join(directory, file), 'utf8'))));
  return reviews.sort((left, right) => left.target.localeCompare(right.target, 'pt-BR'));
}

export async function readReview(root, target) {
  const file = path.join(root, 'docs', 'editorial-reviews', reviewFileName(normalizeTarget(target)));
  return { file, review: JSON.parse(await readFile(file, 'utf8')) };
}

function replaceOccurrence(body, exactText, occurrence, replacement) {
  if (!exactText) throw new Error('Apontamento sem trecho exato não pode ser aplicado automaticamente.');
  let seen = 0;
  return body.replaceAll(exactText, (match) => (++seen === occurrence ? replacement : match));
}

export async function saveReviewResolution(root, target, findingId, resolution, actor = 'local-maintainer') {
  const { file, review } = await readReview(root, target);
  const findingItem = review.findings.find((item) => item.id === findingId);
  if (!findingItem) throw new Error('Apontamento inexistente.');
  if (!['accepted', 'rejected'].includes(resolution.status)) throw new Error('Resolução inválida.');
  if (findingItem.kind === 'blocker' && resolution.status === 'rejected') throw new Error('Bloqueios objetivos não aceitam override.');
  if (resolution.status === 'rejected' && String(resolution.justification ?? '').trim().length < 10) throw new Error('Rejeição exige justificativa.');
  findingItem.resolution = { status: resolution.status, replacement: resolution.status === 'accepted' ? String(resolution.replacement ?? '') : '', justification: String(resolution.justification ?? '').trim() };
  review.updatedAt = new Date().toISOString();
  review.history.push({ occurredAt: review.updatedAt, action: `finding_${resolution.status}`, actor, findingId });
  await writeFile(file, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  return review;
}

export async function applyReview(root, target) {
  const content = await readContent(root, target);
  const { file, review } = await readReview(root, target);
  if (review.schemaVersion !== 2 || content.contentHash !== review.contentHash) throw new Error('O parecer v2 não corresponde à versão atual. Gere uma nova auditoria.');
  if (review.findings.some((item) => item.resolution?.status === 'pending')) throw new Error('Todos os apontamentos precisam ser resolvidos.');
  if (review.findings.some((item) => item.kind === 'blocker' && item.resolution?.status !== 'accepted')) throw new Error('Bloqueios objetivos precisam ser corrigidos.');
  const body = review.findings.filter((item) => item.resolution?.status === 'accepted' && item.exactText)
    .sort((left, right) => right.line - left.line)
    .reduce((current, item) => replaceOccurrence(current, item.exactText, item.occurrence, item.resolution.replacement), content.body);
  const candidate = { ...content, body };
  const analysis = analyzeContent(candidate);
  const now = new Date().toISOString();
  const status = analysis.decision === 'blocked' ? 'draft' : analysis.decision === 'owner_review_required' ? 'in_review' : 'approved';
  const data = { ...content.data, status };
  if (body !== content.body) {
    if ('lastUpdatedAt' in data) data.lastUpdatedAt = now;
    if ('updatedAt' in data) data.updatedAt = now;
  }
  const source = serializeMarkdown(data, body);
  await writeFile(content.file, source, 'utf8');
  review.updatedAt = now;
  review.contentHash = sha256(source);
  review.resultingContentHash = review.contentHash;
  review.resultingStatus = status;
  review.decision = analysis.decision;
  review.publicationAllowed = analysis.decision === 'approved_for_publication';
  review.blockers = analysis.blockers.map((item) => item.id);
  review.escalations = analysis.escalations.map((item) => item.id);
  review.specialists = specialistResults(analysis);
  review.ownerApproval = null;
  review.history.push({ occurredAt: now, action: 'review_applied', actor: 'codex-editorial-orchestrator', resultingStatus: status });
  await writeFile(file, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  return { target: content.target, status, decision: review.decision };
}

export async function approveOwnerEscalations(root, target, confirmation, justification) {
  if (String(confirmation ?? '').trim() !== 'Estou ciente e aprovo') throw new Error('Digite exatamente: Estou ciente e aprovo');
  if (String(justification ?? '').trim().length < 20) throw new Error('Informe uma justificativa com ao menos 20 caracteres.');
  const content = await readContent(root, target);
  const { file, review } = await readReview(root, target);
  if (review.schemaVersion !== 2 || review.contentHash !== content.contentHash) throw new Error('O parecer não corresponde à versão atual.');
  if (review.decision !== 'owner_review_required' || review.blockers.length) throw new Error('Este conteúdo não está apto para aprovação do mantenedor.');
  const now = new Date().toISOString();
  const source = serializeMarkdown({ ...content.data, status: 'approved' }, content.body);
  await writeFile(content.file, source, 'utf8');
  review.updatedAt = now;
  review.decision = 'approved_for_publication';
  review.publicationAllowed = true;
  review.ownerApproval = { actor: 'local-maintainer', approvedAt: now, contentHash: sha256(source), justification: String(justification).trim() };
  review.contentHash = review.ownerApproval.contentHash;
  review.resultingContentHash = review.ownerApproval.contentHash;
  review.resultingStatus = 'approved';
  review.history.push({ occurredAt: now, action: 'owner_escalations_approved', actor: 'local-maintainer' });
  await writeFile(file, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  return { target: content.target, status: 'approved', decision: review.decision };
}

export async function markDraft(root, target, reason) {
  if (String(reason ?? '').trim().length < 10) throw new Error('Informe um motivo com ao menos 10 caracteres.');
  const content = await readContent(root, target);
  const source = serializeMarkdown({ ...content.data, status: 'draft' }, content.body);
  await writeFile(content.file, source, 'utf8');
  return { target: content.target, status: 'draft' };
}

export async function listContentTargets(root) {
  const targets = [];
  for (const collection of CONTENT_COLLECTIONS) {
    const directory = path.join(root, 'src', 'content', collection);
    for (const file of await readdir(directory)) if (file.endsWith('.md')) targets.push(`${collection}/${file.replace(/\.md$/i, '')}`);
  }
  return targets.sort((left, right) => left.localeCompare(right, 'pt-BR'));
}
