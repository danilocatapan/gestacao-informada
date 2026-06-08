import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  applyReview,
  generateReview,
  readContent,
  readReview,
  saveReviewResolution,
  serializeMarkdown,
} from './editorial-pipeline-lib.mjs';
import { createEditorialReviewServer } from './editorial-review-server.mjs';
import {
  addSafetyReview,
  approveContent,
  recordDomainReview,
  recordEditorialApproval,
  registerContributor,
} from './human-editorial-lib.mjs';

const root = await mkdtemp(path.join(tmpdir(), 'gestacao-editorial-'));
const rawRequest = (options) => new Promise((resolve, reject) => {
  const request = httpRequest(options, (response) => {
    response.resume();
    response.on('end', () => resolve(response.statusCode));
  });
  request.on('error', reject);
  request.end();
});
await mkdir(path.join(root, 'src', 'content', 'articles'), { recursive: true });
await mkdir(path.join(root, 'src', 'content', 'editorial-records'), { recursive: true });
await mkdir(path.join(root, 'src', 'content', 'contributors'), { recursive: true });
await mkdir(path.join(root, 'src', 'content', 'references'), { recursive: true });
await mkdir(path.join(root, 'src', 'content', 'pages'), { recursive: true });
await mkdir(path.join(root, 'src', 'content', 'glossary'), { recursive: true });
await mkdir(path.join(root, 'src', 'content', 'legal'), { recursive: true });
const target = 'articles/exemplo';
const file = path.join(root, 'src', 'content', 'articles', 'exemplo.md');
const baseData = {
  title: 'Exemplo',
  contentType: 'article',
  clinical: true,
  riskDomains: ['clinical'],
  status: 'draft',
  lastUpdatedAt: '2026-06-08',
  medicalDisclaimer: 'Conteúdo educativo.',
};
await writeFile(file, serializeMarkdown(baseData, 'Este texto garante resultado.\n'), 'utf8');

const generated = await generateReview(root, target);
assert.equal(generated.decision, 'blocked');
assert.equal(generated.findings.length, 1);
assert.equal(generated.findings[0].severity, 'critical');

await assert.rejects(() => applyReview(root, target), /precisam ser resolvidos/);
await saveReviewResolution(root, target, generated.findings[0].id, {
  status: 'accepted',
  replacement: 'pode ajudar a compreender possibilidades',
});
const result = await applyReview(root, target);
assert.equal(result.status, 'in_review');
assert.match((await readFile(file, 'utf8')), /pode ajudar a compreender possibilidades/);
assert.doesNotMatch((await readFile(file, 'utf8')), /garante/);

const second = await generateReview(root, target);
await writeFile(file, `${await readFile(file, 'utf8')}\nMudança externa.\n`, 'utf8');
await assert.rejects(() => applyReview(root, target), /conteúdo mudou/i);
assert.equal((await readReview(root, target)).review.id, second.id);

const rejectedTarget = 'articles/rejeitado';
await writeFile(path.join(root, 'src', 'content', 'articles', 'rejeitado.md'), serializeMarkdown(baseData, 'TODO: revisar.\n'), 'utf8');
const rejected = await generateReview(root, rejectedTarget);
await assert.rejects(() => saveReviewResolution(root, rejectedTarget, rejected.findings[0].id, {
  status: 'rejected',
  justification: 'curta',
}), /ao menos 10/);
await saveReviewResolution(root, rejectedTarget, rejected.findings[0].id, {
  status: 'rejected',
  justification: 'O placeholder será mantido por enquanto.',
});
await assert.rejects(() => applyReview(root, rejectedTarget), /altos ou críticos/);

const app = createEditorialReviewServer({ root, port: 4188, token: 'token-de-teste' });
await new Promise((resolve) => app.server.listen(app.port, app.host, resolve));
try {
  const home = await fetch(`${app.origin}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Painel editorial local/);
  const wrongHost = await rawRequest({ hostname: app.host, port: app.port, path: '/api/reviews', headers: { host: 'localhost:4188' } });
  assert.equal(wrongHost, 403);
  const method = await fetch(`${app.origin}/api/apply`);
  assert.equal(method.status, 405);
  const noToken = await fetch(`${app.origin}/api/apply`, {
    method: 'POST',
    headers: { origin: app.origin, 'content-type': 'application/json' },
    body: JSON.stringify({ target }),
  });
  assert.equal(noToken.status, 403);
  const badOrigin = await fetch(`${app.origin}/api/apply`, {
    method: 'POST',
    headers: { origin: 'http://example.com', 'x-editorial-token': app.token, 'content-type': 'application/json' },
    body: JSON.stringify({ target }),
  });
  assert.equal(badOrigin.status, 403);
} finally {
  await new Promise((resolve, reject) => app.server.close((error) => error ? reject(error) : resolve()));
}

const content = await readContent(root, target);
assert.equal(content.data.status, 'in_review');

await writeFile(path.join(root, 'src', 'content', 'contributors', 'equipe-editorial.json'), JSON.stringify({
  name: 'Equipe editorial',
  role: 'Autoria',
  editorialRoles: ['author'],
  credentials: 'Equipe identificada',
  bio: 'Equipe responsável pela autoria institucional dos conteúdos.',
}), 'utf8');
for (const person of [
  ['clinico', 'Revisor Clínico', 'clinical_reviewer'],
  ['psicologo', 'Revisor Psicológico', 'psychological_reviewer'],
  ['editor', 'Aprovador Editorial', 'editorial_approver'],
]) {
  await registerContributor(root, {
    id: person[0],
    name: person[1],
    role: person[2],
    publicRole: person[1],
    credentials: 'Credenciais profissionais verificadas',
    bio: 'Participante humano cadastrado para validar o fluxo editorial.',
    consentConfirmed: true,
    nameConfirmation: person[1],
  });
}
await assert.rejects(() => registerContributor(root, {
  id: 'sem-consentimento',
  name: 'Pessoa Sem Consentimento',
  role: 'clinical_reviewer',
  credentials: 'Credenciais informadas',
  bio: 'Biografia pública suficiente para realizar o cadastro.',
  consentConfirmed: false,
  nameConfirmation: 'Pessoa Sem Consentimento',
}), /consentimento/);

const sourceUrl = 'https://example.com/diretriz';
await writeFile(path.join(root, 'src', 'content', 'references', 'diretriz.json'), JSON.stringify({
  id: 'diretriz',
  title: 'Diretriz de teste',
  url: sourceUrl,
  publisher: 'Instituição de teste',
  type: 'guideline',
  domain: 'clinical',
  authorityLevel: 'high',
  summary: 'Referência usada pelo teste.',
  usableFor: ['Validação determinística'],
  notUsableFor: [],
  limitations: [],
  lastCheckedAt: '2026-06-08',
}), 'utf8');
for (const id of ['privacidade', 'termos-de-uso', 'politica-editorial']) {
  await writeFile(path.join(root, 'src', 'content', 'legal', `${id}.md`), serializeMarkdown({
    title: id,
    description: 'Documento interno.',
    contentType: 'legal-document',
    clinical: false,
    riskDomains: ['legal'],
    status: 'draft',
    updatedAt: '2026-06-08',
    reviewer: null,
    reviewedAt: null,
  }, 'Documento interno.\n'), 'utf8');
}

const humanTarget = 'articles/fluxo-humano';
await writeFile(path.join(root, 'src', 'content', 'articles', 'fluxo-humano.md'), serializeMarkdown({
  title: 'Fluxo humano',
  description: 'Artigo completo para validar decisões humanas.',
  category: 'Teste',
  objective: 'Validar o fluxo.',
  audience: 'Equipe de desenvolvimento.',
  contentType: 'article',
  clinical: true,
  riskDomains: ['clinical', 'psychological'],
  status: 'draft',
  authoredBy: 'equipe-editorial',
  sources: [{ title: 'Diretriz de teste', url: sourceUrl, publisher: 'Instituição de teste', accessedAt: '2026-06-08', type: 'guideline' }],
  lastUpdatedAt: '2026-06-08',
  medicalDisclaimer: 'Conteúdo educativo que não substitui avaliação profissional individual.',
  safetyReview: [],
  aiAssistance: {
    activities: ['safety-audit'],
    disclosure: 'Este conteúdo recebeu auditoria de segurança assistida por inteligência artificial.',
  },
  inspirationCredits: [],
  glossaryTerms: [],
}, 'Texto educativo sem termos sensíveis controlados pelo gate.\n'), 'utf8');
await generateReview(root, humanTarget);
await applyReview(root, humanTarget);

await assert.rejects(() => recordDomainReview(root, {
  target: humanTarget,
  actor: 'editor',
  confirmation: 'Aprovador Editorial',
  domain: 'clinical',
  decision: 'approved',
  justification: 'Decisão humana com justificativa suficiente.',
}), /clinical_reviewer/);
await assert.rejects(() => recordDomainReview(root, {
  target: humanTarget,
  actor: 'clinico',
  confirmation: 'Nome incorreto',
  domain: 'clinical',
  decision: 'approved',
  justification: 'Decisão humana com justificativa suficiente.',
}), /confirmação nominal/);

await recordDomainReview(root, {
  target: humanTarget,
  actor: 'clinico',
  confirmation: 'Revisor Clínico',
  domain: 'clinical',
  decision: 'approved',
  justification: 'A precisão clínica e os limites educativos foram revisados.',
});
await assert.rejects(() => recordEditorialApproval(root, {
  target: humanTarget,
  actor: 'editor',
  confirmation: 'Aprovador Editorial',
  decision: 'approved',
  justification: 'A integridade editorial foi revisada e confirmada.',
}), /psychological/);
await assert.rejects(() => recordDomainReview(root, {
  target: humanTarget,
  actor: 'clinico',
  confirmation: 'Revisor Clínico',
  domain: 'psychological',
  decision: 'approved',
  justification: 'A linguagem psicológica foi revisada cuidadosamente.',
}), /psychological_reviewer|participantes distintos/);
await recordDomainReview(root, {
  target: humanTarget,
  actor: 'psicologo',
  confirmation: 'Revisor Psicológico',
  domain: 'psychological',
  decision: 'rejected',
  justification: 'A linguagem psicológica exige nova avaliação antes da aprovação.',
});
await assert.rejects(() => recordEditorialApproval(root, {
  target: humanTarget,
  actor: 'editor',
  confirmation: 'Aprovador Editorial',
  decision: 'approved',
  justification: 'A integridade editorial foi revisada e confirmada.',
}), /psychological/);
await recordDomainReview(root, {
  target: humanTarget,
  actor: 'psicologo',
  confirmation: 'Revisor Psicológico',
  domain: 'psychological',
  decision: 'approved',
  justification: 'O acolhimento e os riscos psicológicos foram revisados novamente.',
});
await recordEditorialApproval(root, {
  target: humanTarget,
  actor: 'editor',
  confirmation: 'Aprovador Editorial',
  decision: 'approved',
  justification: 'A trilha está íntegra e as responsabilidades permanecem independentes.',
});
await approveContent(root, {
  target: humanTarget,
  actor: 'editor',
  confirmation: 'Aprovador Editorial',
  justification: 'Transição final autorizada após todos os gates humanos e técnicos.',
});
assert.equal((await readContent(root, humanTarget)).data.status, 'approved');

const staleTarget = 'articles/decisao-obsoleta';
await writeFile(path.join(root, 'src', 'content', 'articles', 'decisao-obsoleta.md'), serializeMarkdown({
  ...baseData,
  authoredBy: 'equipe-editorial',
  riskDomains: ['clinical'],
}, 'Texto educativo sem pendências.\n'), 'utf8');
await generateReview(root, staleTarget);
await applyReview(root, staleTarget);
const staleContent = await readContent(root, staleTarget);
await writeFile(staleContent.file, `${staleContent.source}\nAlteração externa.\n`, 'utf8');
await assert.rejects(() => recordDomainReview(root, {
  target: staleTarget,
  actor: 'clinico',
  confirmation: 'Revisor Clínico',
  domain: 'clinical',
  decision: 'approved',
  justification: 'A versão foi revisada e considerada adequada.',
}), /não corresponde à versão atual/);

const safetyTarget = 'articles/excecao-seguranca';
await writeFile(path.join(root, 'src', 'content', 'articles', 'excecao-seguranca.md'), serializeMarkdown({
  ...baseData,
  authoredBy: 'equipe-editorial',
  riskDomains: ['clinical'],
  safetyReview: [],
}, 'Texto educativo menciona AAS apenas para validar o gate.\n'), 'utf8');
await generateReview(root, safetyTarget);
await applyReview(root, safetyTarget);
await addSafetyReview(root, {
  target: safetyTarget,
  actor: 'clinico',
  confirmation: 'Revisor Clínico',
  term: 'AAS',
  justification: 'O termo aparece somente em contexto educativo e exige avaliação profissional.',
});
const safetyContent = await readContent(root, safetyTarget);
assert.equal(safetyContent.data.status, 'draft');
assert.equal(safetyContent.data.safetyReview[0].reviewedBy, 'clinico');

console.log('Testes da pipeline e do painel editorial local concluídos.');
