import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  readContent,
  readReview,
  serializeMarkdown,
  writeEditorialRecord,
} from './editorial-pipeline-lib.mjs';
import {
  loadEditorialState,
  validateEditorialState,
  validateGlossaryInventory,
  validateLegalInventory,
  validateReferenceInventory,
} from './editorial-validation.mjs';

export const EDITORIAL_ROLES = [
  'author',
  'clinical_reviewer',
  'psychological_reviewer',
  'legal_reviewer',
  'editorial_approver',
];

const ROLE_FOR_DOMAIN = {
  clinical: 'clinical_reviewer',
  psychological: 'psychological_reviewer',
  legal: 'legal_reviewer',
};

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sameTime = (left, right) => new Date(left).getTime() === new Date(right).getTime();
const updatedAtFor = (content) => content.data.lastUpdatedAt ?? content.data.updatedAt;

async function jsonFiles(directory) {
  try {
    return (await readdir(directory)).filter((file) => file.endsWith('.json'));
  } catch {
    return [];
  }
}

async function contributorsFor(root) {
  const directory = path.join(root, 'src', 'content', 'contributors');
  return Promise.all((await jsonFiles(directory)).map(async (file) => ({
    id: file.replace(/\.json$/i, ''),
    ...JSON.parse(await readFile(path.join(directory, file), 'utf8')),
  })));
}

async function recordsFor(root, target) {
  const directory = path.join(root, 'src', 'content', 'editorial-records');
  const records = await Promise.all((await jsonFiles(directory)).map(async (file) =>
    JSON.parse(await readFile(path.join(directory, file), 'utf8'))));
  return records.filter((record) => !target || record.target === target)
    .sort((left, right) => new Date(left.occurredAt) - new Date(right.occurredAt));
}

function contributorById(contributors, actor) {
  const contributor = contributors.find((item) => item.id === actor);
  if (!contributor) throw new Error('Participante inexistente.');
  return contributor;
}

function confirmIdentity(contributor, confirmation) {
  if (String(confirmation ?? '').trim() !== contributor.name) {
    throw new Error('A confirmação nominal deve corresponder exatamente ao nome público do participante.');
  }
}

function requireJustification(justification) {
  const value = String(justification ?? '').trim();
  if (value.length < 20) throw new Error('A decisão exige justificativa auditável com ao menos 20 caracteres.');
  return value;
}

function latest(records, event, domain) {
  return records.filter((record) => record.event === event && (!domain || record.domain === domain)).at(-1);
}

function requireCurrentAutomatedReview(content, review) {
  if (review.resultingContentHash !== content.contentHash || review.resultingStatus !== 'in_review') {
    throw new Error('O parecer automatizado não corresponde à versão atual enviada para revisão.');
  }
  if (review.findings.some((finding) => finding.resolution?.status === 'pending')) {
    throw new Error('Existem apontamentos automatizados pendentes.');
  }
  if (review.findings.some((finding) =>
    ['high', 'critical'].includes(finding.severity) && finding.resolution?.status !== 'accepted')) {
    throw new Error('Existem apontamentos automatizados bloqueantes.');
  }
}

function requireIndependentActor(content, records, actor, event, domain) {
  if (content.data.authoredBy === actor) throw new Error('O autor não pode revisar nem aprovar o próprio conteúdo.');
  const decisionActors = records
    .filter((record) => record.event === 'editorial_approval' || record.event === 'domain_review')
    .filter((record) => record.event !== event || record.domain !== domain)
    .map((record) => record.actor);
  if (decisionActors.includes(actor)) {
    throw new Error('Autor, revisores de domínio e aprovador editorial devem ser participantes distintos.');
  }
}

function requireCurrentApprovedDomains(content, records) {
  const contentUpdatedAt = updatedAtFor(content);
  for (const domain of content.data.riskDomains ?? []) {
    const review = latest(records, 'domain_review', domain);
    if (!review || review.decision !== 'approved' || !sameTime(review.contentUpdatedAt, contentUpdatedAt)) {
      throw new Error(`A revisão ${domain} aprovada e atualizada é obrigatória.`);
    }
  }
}

export async function listHumanEditorialState(root, target) {
  const [content, contributors, records] = await Promise.all([
    readContent(root, target),
    contributorsFor(root),
    recordsFor(root, target),
  ]);
  let review = null;
  try {
    review = (await readReview(root, target)).review;
  } catch {
    // Conteúdo sem parecer ainda deve aparecer como bloqueado no painel humano.
  }
  return {
    content: {
      target: content.target,
      data: content.data,
      contentHash: content.contentHash,
    },
    contributors,
    records,
    automatedReviewCurrent: Boolean(
      review
      && review.resultingContentHash === content.contentHash
      && review.resultingStatus === 'in_review',
    ),
  };
}

export async function registerContributor(root, input) {
  const id = String(input.id ?? '').trim();
  const name = String(input.name ?? '').trim();
  const role = String(input.role ?? '').trim();
  const credentials = String(input.credentials ?? '').trim();
  const bio = String(input.bio ?? '').trim();
  if (!idPattern.test(id)) throw new Error('O identificador deve usar somente letras minúsculas, números e hífens.');
  if (name.length < 3 || credentials.length < 5 || bio.length < 20) throw new Error('Preencha nome, credenciais e biografia pública.');
  if (!EDITORIAL_ROLES.includes(role)) throw new Error('Papel editorial inválido.');
  if (input.consentConfirmed !== true) throw new Error('Confirme que consentimento e credenciais foram verificados fora do repositório.');
  if (String(input.nameConfirmation ?? '').trim() !== name) throw new Error('A confirmação nominal deve corresponder ao nome público.');
  const directory = path.join(root, 'src', 'content', 'contributors');
  await mkdir(directory, { recursive: true });
  const contributor = { name, role: String(input.publicRole ?? role).trim() || role, editorialRoles: [role], credentials, bio };
  await writeFile(path.join(directory, `${id}.json`), `${JSON.stringify(contributor, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  return { id, ...contributor };
}

export async function addSafetyReview(root, input) {
  const content = await readContent(root, input.target);
  if (!['draft', 'in_review'].includes(content.data.status)) throw new Error('Exceções de segurança só podem ser registradas antes da aprovação.');
  const contributors = await contributorsFor(root);
  const contributor = contributorById(contributors, input.actor);
  confirmIdentity(contributor, input.confirmation);
  const allowedRoles = (content.data.riskDomains ?? []).map((domain) => ROLE_FOR_DOMAIN[domain]);
  const role = contributor.editorialRoles.find((item) => allowedRoles.includes(item));
  if (!role) throw new Error('O participante não possui papel profissional compatível com os domínios do conteúdo.');
  if (content.data.authoredBy === input.actor) throw new Error('O autor não pode registrar a própria exceção de segurança.');
  const term = String(input.term ?? '').trim();
  const justification = requireJustification(input.justification);
  if (!term) throw new Error('Informe o termo sensível.');
  const now = new Date().toISOString();
  const data = {
    ...content.data,
    status: 'draft',
    safetyReview: [
      ...(content.data.safetyReview ?? []).filter((review) => String(review.term).toLocaleLowerCase('pt-BR') !== term.toLocaleLowerCase('pt-BR')),
      { term, justification, reviewedBy: input.actor, reviewedAt: now },
    ],
  };
  if ('lastUpdatedAt' in data) data.lastUpdatedAt = now;
  if ('updatedAt' in data) data.updatedAt = now;
  await writeFile(content.file, serializeMarkdown(data, content.body), 'utf8');
  if (content.data.status === 'in_review') {
    await writeEditorialRecord(root, {
      target: content.target,
      event: 'status_transition',
      actor: input.actor,
      role,
      occurredAt: now,
      contentUpdatedAt: updatedAtFor({ data }),
      fromStatus: 'in_review',
      toStatus: 'draft',
      justification: 'Conteúdo retornado a draft após registro humano de exceção de segurança.',
    });
  }
  return { target: content.target, status: data.status, term };
}

export async function recordDomainReview(root, input) {
  const [content, contributors, records, reviewResult] = await Promise.all([
    readContent(root, input.target),
    contributorsFor(root),
    recordsFor(root, input.target),
    readReview(root, input.target),
  ]);
  if (content.data.status !== 'in_review') throw new Error('Revisões de domínio exigem conteúdo em in_review.');
  requireCurrentAutomatedReview(content, reviewResult.review);
  const contributor = contributorById(contributors, input.actor);
  confirmIdentity(contributor, input.confirmation);
  const role = ROLE_FOR_DOMAIN[input.domain];
  if (!role || !(content.data.riskDomains ?? []).includes(input.domain)) throw new Error('Domínio não exigido por este conteúdo.');
  if (!contributor.editorialRoles.includes(role)) throw new Error(`O participante não possui o papel ${role}.`);
  requireIndependentActor(content, records, input.actor, 'domain_review', input.domain);
  if (!['approved', 'rejected'].includes(input.decision)) throw new Error('Decisão profissional inválida.');
  const now = new Date().toISOString();
  await writeEditorialRecord(root, {
    target: content.target,
    event: 'domain_review',
    actor: input.actor,
    role,
    domain: input.domain,
    decision: input.decision,
    occurredAt: now,
    contentUpdatedAt: updatedAtFor(content),
    justification: requireJustification(input.justification),
  });
  return { target: content.target, domain: input.domain, decision: input.decision };
}

export async function recordEditorialApproval(root, input) {
  const [content, contributors, records, reviewResult] = await Promise.all([
    readContent(root, input.target),
    contributorsFor(root),
    recordsFor(root, input.target),
    readReview(root, input.target),
  ]);
  if (content.data.status !== 'in_review') throw new Error('Aprovação editorial exige conteúdo em in_review.');
  requireCurrentAutomatedReview(content, reviewResult.review);
  const contributor = contributorById(contributors, input.actor);
  confirmIdentity(contributor, input.confirmation);
  if (!contributor.editorialRoles.includes('editorial_approver')) throw new Error('O participante não possui o papel editorial_approver.');
  requireIndependentActor(content, records, input.actor, 'editorial_approval');
  if (!['approved', 'rejected'].includes(input.decision)) throw new Error('Decisão editorial inválida.');
  if (input.decision === 'approved') requireCurrentApprovedDomains(content, records);
  const now = new Date().toISOString();
  await writeEditorialRecord(root, {
    target: content.target,
    event: 'editorial_approval',
    actor: input.actor,
    role: 'editorial_approver',
    decision: input.decision,
    occurredAt: now,
    contentUpdatedAt: updatedAtFor(content),
    justification: requireJustification(input.justification),
  });
  return { target: content.target, decision: input.decision };
}

export async function approveContent(root, input) {
  const [content, contributors, records, reviewResult] = await Promise.all([
    readContent(root, input.target),
    contributorsFor(root),
    recordsFor(root, input.target),
    readReview(root, input.target),
  ]);
  if (content.data.status !== 'in_review') throw new Error('A transição final exige conteúdo em in_review.');
  requireCurrentAutomatedReview(content, reviewResult.review);
  const contributor = contributorById(contributors, input.actor);
  confirmIdentity(contributor, input.confirmation);
  if (!contributor.editorialRoles.includes('editorial_approver')) throw new Error('A transição final exige aprovador editorial.');
  requireCurrentApprovedDomains(content, records);
  const approval = latest(records, 'editorial_approval');
  if (!approval || approval.actor !== input.actor || approval.decision !== 'approved' || !sameTime(approval.contentUpdatedAt, updatedAtFor(content))) {
    throw new Error('A aprovação editorial atual do participante é obrigatória antes da transição final.');
  }
  const now = new Date().toISOString();
  const transition = {
    target: content.target,
    event: 'status_transition',
    actor: input.actor,
    role: 'editorial_approver',
    occurredAt: now,
    contentUpdatedAt: updatedAtFor(content),
    fromStatus: 'in_review',
    toStatus: 'approved',
    justification: requireJustification(input.justification),
  };
  const state = await loadEditorialState(root);
  const candidate = state.contents.map((item) => item.id === content.target
    ? { ...item, data: { ...item.data, status: 'approved' } }
    : item);
  const failures = [
    ...validateEditorialState({ contents: candidate, contributors: state.contributors, records: [...state.records, transition] }),
    ...validateGlossaryInventory(candidate),
    ...validateLegalInventory(candidate),
    ...validateReferenceInventory(candidate, state.references),
  ];
  if (failures.length) throw new Error(`Publicação bloqueada:\n- ${failures.join('\n- ')}`);
  await writeFile(content.file, serializeMarkdown({ ...content.data, status: 'approved' }, content.body), 'utf8');
  await writeEditorialRecord(root, transition);
  return { target: content.target, status: 'approved' };
}
