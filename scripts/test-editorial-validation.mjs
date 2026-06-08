import assert from 'node:assert/strict';
import { validateEditorialState, validateGlossaryInventory, validateLegalInventory } from './editorial-validation.mjs';

const approved = {
  id: 'articles/seguro',
  collection: 'articles',
  body: 'Síntese educativa baseada nas fontes listadas.',
  contentHash: 'hash-atual',
  data: {
    title: 'Conteúdo seguro',
    description: 'Descrição',
    status: 'approved',
    contentType: 'article',
    clinical: true,
    riskDomains: ['clinical'],
    authoredBy: 'equipe-editorial',
    sources: [{ url: 'https://example.org/fonte' }],
    medicalDisclaimer: 'Conteúdo educativo.',
    safetyReview: [],
  },
};
const contributor = { id: 'equipe-editorial', name: 'Equipe editorial', role: 'Autoria', bio: 'Perfil institucional.' };
const review = { schemaVersion: 2, target: approved.id, decision: 'approved_for_publication', resultingContentHash: approved.contentHash };
const failuresFor = (content = approved, reviews = [review]) => validateEditorialState({ contents: [content], contributors: [contributor], reviews });
const expectFailure = (label, failures, pattern) => assert.match(failures.join('\n'), pattern, label);

assert.deepEqual(failuresFor(), []);
expectFailure('parecer v2 obrigatório', failuresFor(approved, []), /parecer editorial v2/);
expectFailure('parecer obsoleto', failuresFor(approved, [{ ...review, resultingContentHash: 'antigo' }]), /versão atual/);
expectFailure('fonte obrigatória', failuresFor({ ...approved, data: { ...approved.data, sources: [] } }), /fonte/);
expectFailure('promessa bloqueada', failuresFor({ ...approved, body: 'Este tratamento garante resultado.' }), /promessa/);
expectFailure('campo profissional removido', validateEditorialState({
  contents: [{ id: 'legal/teste', collection: 'legal', body: '', contentHash: 'x', data: { status: 'draft', clinical: false, contentType: 'legal-document', riskDomains: ['legal'], reviewer: null } }],
  contributors: [],
  reviews: [],
}), /campos de revisão profissional/);
assert.deepEqual(validateGlossaryInventory([]), []);
assert.ok(validateLegalInventory([]).length >= 3);

console.log('Testes negativos do gate editorial v2 concluídos.');
