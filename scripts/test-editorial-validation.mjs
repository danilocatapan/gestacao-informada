import assert from 'node:assert/strict';
import { validateEditorialState } from './editorial-validation.mjs';

const updatedAt = '2026-06-07T12:00:00.000Z';
const baseContent = {
  id: 'articles/exemplo',
  collection: 'articles',
  body: 'Conteúdo educativo.',
  data: {
    status: 'approved',
    clinical: true,
    riskDomains: ['clinical'],
    authoredBy: 'autor',
    sources: [{ title: 'Fonte' }],
    lastUpdatedAt: updatedAt,
    safetyReview: [],
  },
};
const contributors = [
  { id: 'autor', editorialRoles: ['author'], credentials: 'Autor identificado' },
  { id: 'submissor', editorialRoles: ['author'], credentials: 'Autor identificado' },
  { id: 'clinico', editorialRoles: ['clinical_reviewer'], credentials: 'Credencial profissional verificada' },
  { id: 'editor', editorialRoles: ['editorial_approver'], credentials: 'Aprovador editorial identificado' },
];
const record = (overrides) => ({
  target: 'articles/exemplo',
  actor: 'editor',
  role: 'editorial_approver',
  occurredAt: '2026-06-07T13:00:00.000Z',
  contentUpdatedAt: updatedAt,
  justification: 'Registro de teste com justificativa suficiente.',
  ...overrides,
});
const validRecords = [
  record({ event: 'submitted_for_review', actor: 'submissor', role: 'author' }),
  record({ event: 'domain_review', actor: 'clinico', role: 'clinical_reviewer', domain: 'clinical', decision: 'approved' }),
  record({ event: 'editorial_approval', decision: 'approved' }),
  record({ event: 'status_transition', actor: 'submissor', role: 'author', fromStatus: 'in_review', toStatus: 'approved' }),
];
const failuresFor = (content = baseContent, records = validRecords, people = contributors) =>
  validateEditorialState({ contents: [content], contributors: people, records });
const expectFailure = (name, failures, pattern) =>
  assert.ok(failures.some((failure) => pattern.test(failure)), `${name}: falha esperada não encontrada.\n${failures.join('\n')}`);

assert.deepEqual(failuresFor(), [], 'fixture válida deve passar');
expectFailure('sem fonte', failuresFor({ ...baseContent, data: { ...baseContent.data, sources: [] } }), /ao menos uma fonte/);
expectFailure('sem autoria', failuresFor({ ...baseContent, data: { ...baseContent.data, authoredBy: undefined } }), /exige autoria/);
expectFailure('autor sem papel', failuresFor(baseContent, validRecords, contributors.map((person) => person.id === 'autor' ? { ...person, editorialRoles: ['editorial_approver'] } : person)), /autorizado como author/);
expectFailure('sem revisão', failuresFor(baseContent, validRecords.filter((item) => item.event !== 'domain_review')), /revisão clinical/);
expectFailure('credencial incompatível', failuresFor(baseContent, validRecords, contributors.map((person) => person.id === 'clinico' ? { ...person, editorialRoles: ['author'] } : person)), /não possui o papel/);
expectFailure('papéis acumulados', failuresFor(baseContent, validRecords.map((item) => item.actor === 'clinico' ? { ...item, actor: 'autor' } : item)), /devem ser distintos/);
expectFailure('aprovação obsoleta', failuresFor(baseContent, validRecords.map((item) => ({ ...item, occurredAt: '2026-06-06T13:00:00.000Z' }))), /atualizada|posterior/);
expectFailure('rejeição posterior', failuresFor(baseContent, [...validRecords, record({ event: 'domain_review', actor: 'clinico', role: 'clinical_reviewer', domain: 'clinical', decision: 'rejected', occurredAt: '2026-06-07T14:00:00.000Z' })]), /revisão clinical/);
expectFailure('transição inválida', failuresFor(baseContent, [...validRecords, record({ event: 'status_transition', actor: 'submissor', role: 'author', fromStatus: 'draft', toStatus: 'approved' })]), /transição editorial inválida/);
expectFailure('jurídico sem revisão', failuresFor({ ...baseContent, data: { ...baseContent.data, riskDomains: ['clinical', 'legal'] } }), /revisão legal/);
expectFailure('alvo inexistente', failuresFor(baseContent, [...validRecords, record({ target: 'articles/inexistente', event: 'submitted_for_review', actor: 'submissor', role: 'author' })]), /conteúdo inexistente/);
assert.deepEqual(validateEditorialState({
  contents: [{ id: 'pages/baixo-risco', collection: 'pages', body: 'Apresentação institucional.', data: { status: 'approved', clinical: false, riskDomains: [], updatedAt } }],
  contributors: [],
  records: [],
}), [], 'página institucional de baixo risco deve passar');

console.log('Testes negativos do gate editorial concluídos.');
