import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  analyzeContent,
  applyReview,
  approveOwnerEscalations,
  generateReview,
  readContent,
  saveReviewResolution,
  serializeMarkdown,
} from './editorial-pipeline-lib.mjs';

const root = await mkdtemp(path.join(tmpdir(), 'gestacao-editorial-v2-'));
await mkdir(path.join(root, 'src', 'content', 'articles'), { recursive: true });
const writeArticle = (id, body, extra = {}) => writeFile(path.join(root, 'src', 'content', 'articles', `${id}.md`), serializeMarkdown({
  title: id,
  description: 'Descrição editorial suficiente.',
  category: 'Teste',
  objective: 'Validar o fluxo.',
  audience: 'Público geral.',
  contentType: 'article',
  clinical: true,
  riskDomains: ['clinical'],
  status: 'draft',
  authoredBy: 'equipe-editorial',
  sources: [{ title: 'Diretriz', url: 'https://example.org', publisher: 'Instituição', accessedAt: '2026-06-08', type: 'guideline' }],
  lastUpdatedAt: '2026-06-08T10:00:00.000Z',
  medicalDisclaimer: 'Conteúdo educativo que não substitui atendimento individual.',
  safetyReview: [],
  aiAssistance: { activities: ['safety-audit'], disclosure: 'Conteúdo preparado e auditado com assistência de IA, sem revisão profissional.' },
  inspirationCredits: [],
  glossaryTerms: [],
  ...extra,
}, body), 'utf8');

await writeArticle('limpo', 'Síntese original baseada em fontes rastreáveis.');
let review = await generateReview(root, 'articles/limpo');
assert.equal(review.schemaVersion, 2);
assert.equal(review.decision, 'approved_for_publication');
assert.equal((await applyReview(root, 'articles/limpo')).status, 'approved');

await writeArticle('bloqueado', 'Este tratamento garante resultado.');
review = await generateReview(root, 'articles/bloqueado');
assert.equal(review.decision, 'blocked');
await assert.rejects(() => saveReviewResolution(root, 'articles/bloqueado', review.findings[0].id, { status: 'rejected', justification: 'Quero ignorar o bloqueio.' }), /não aceitam override/);
await saveReviewResolution(root, 'articles/bloqueado', review.findings[0].id, { status: 'accepted', replacement: 'pode ter resultados diferentes' });
assert.equal((await applyReview(root, 'articles/bloqueado')).status, 'approved');

await writeArticle('escalado', 'Este conteúdo aguarda revisão profissional.');
review = await generateReview(root, 'articles/escalado');
assert.equal(review.decision, 'owner_review_required');
await saveReviewResolution(root, 'articles/escalado', review.findings[0].id, { status: 'rejected', justification: 'A menção será mantida como contexto histórico.' });
assert.equal((await applyReview(root, 'articles/escalado')).status, 'in_review');
await assert.rejects(() => approveOwnerEscalations(root, 'articles/escalado', 'Aprovo', 'Justificativa suficientemente longa.'), /Digite exatamente/);
assert.equal((await approveOwnerEscalations(root, 'articles/escalado', 'Estou ciente e aprovo', 'Estou ciente da escalada registrada neste parecer.')).status, 'approved');

const current = await readContent(root, 'articles/escalado');
await writeFile(current.file, `${await readFile(current.file, 'utf8')}\nMudança posterior.`, 'utf8');
await assert.rejects(() => approveOwnerEscalations(root, 'articles/escalado', 'Estou ciente e aprovo', 'Nova tentativa após alteração do conteúdo.'), /versão atual/);
assert.equal(analyzeContent({ target: 'articles/x', data: { riskDomains: ['clinical'], sources: [], medicalDisclaimer: '' }, body: 'Texto.' }).decision, 'blocked');

console.log('Testes da pipeline editorial v2 concluídos.');
