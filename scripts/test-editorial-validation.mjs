import assert from 'node:assert/strict';
import { validateEditorialState, validateGlossaryInventory, validateLegalInventory } from './editorial-validation.mjs';

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
    medicalDisclaimer: 'Conteúdo educativo que não substitui avaliação profissional.',
    safetyReview: [],
    aiAssistance: {
      activities: ['topic-research', 'source-triage', 'drafting', 'safety-audit'],
      disclosure: 'Conteúdo preparado com assistência de IA e sujeito a revisão profissional humana.',
    },
  },
};
const contributors = [
  { id: 'autor', editorialRoles: ['author'], credentials: 'Autor identificado' },
  { id: 'submissor', editorialRoles: ['author'], credentials: 'Autor identificado' },
  { id: 'clinico', editorialRoles: ['clinical_reviewer'], credentials: 'Credencial profissional verificada' },
  { id: 'juridico', editorialRoles: ['legal_reviewer'], credentials: 'Credencial profissional verificada' },
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
expectFailure('sem disclaimer', failuresFor({ ...baseContent, data: { ...baseContent.data, medicalDisclaimer: '' } }), /medicalDisclaimer/);
expectFailure('sem transparência de IA', failuresFor({ ...baseContent, data: { ...baseContent.data, aiAssistance: undefined } }), /assistência por IA/);
expectFailure('IA não substitui revisão', failuresFor({ ...baseContent, data: { ...baseContent.data, aiAssistance: { activities: ['safety-audit'], disclosure: 'Auditoria clínica assistida por IA registrada para este conteúdo.' } } }, validRecords.filter((item) => item.event !== 'domain_review')), /revisão clinical/);
expectFailure('termo sensível sem exceção', failuresFor({ ...baseContent, body: 'O texto menciona enoxaparina apenas em contexto educativo.' }), /termo sensível "enoxaparina"/);
expectFailure('autor sem papel', failuresFor(baseContent, validRecords, contributors.map((person) => person.id === 'autor' ? { ...person, editorialRoles: ['editorial_approver'] } : person)), /autorizado como author/);
expectFailure('sem revisão', failuresFor(baseContent, validRecords.filter((item) => item.event !== 'domain_review')), /revisão clinical/);
expectFailure('credencial incompatível', failuresFor(baseContent, validRecords, contributors.map((person) => person.id === 'clinico' ? { ...person, editorialRoles: ['author'] } : person)), /não possui o papel/);
expectFailure('papéis acumulados', failuresFor(baseContent, validRecords.map((item) => item.actor === 'clinico' ? { ...item, actor: 'autor' } : item)), /devem ser distintos/);
expectFailure('aprovação obsoleta', failuresFor(baseContent, validRecords.map((item) => ({ ...item, occurredAt: '2026-06-06T13:00:00.000Z' }))), /atualizada|posterior/);
expectFailure('rejeição posterior', failuresFor(baseContent, [...validRecords, record({ event: 'domain_review', actor: 'clinico', role: 'clinical_reviewer', domain: 'clinical', decision: 'rejected', occurredAt: '2026-06-07T14:00:00.000Z' })]), /revisão clinical/);
expectFailure('transição inválida', failuresFor(baseContent, [...validRecords, record({ event: 'status_transition', actor: 'submissor', role: 'author', fromStatus: 'draft', toStatus: 'approved' })]), /transição editorial inválida/);
expectFailure('jurídico sem revisão', failuresFor({ ...baseContent, data: { ...baseContent.data, riskDomains: ['clinical', 'legal'] } }), /revisão legal/);
expectFailure('alvo inexistente', failuresFor(baseContent, [...validRecords, record({ target: 'articles/inexistente', event: 'submitted_for_review', actor: 'submissor', role: 'author' })]), /conteúdo inexistente/);

expectFailure('artigo com termo não aprovado', validateEditorialState({
  contents: [
    { ...baseContent, data: { ...baseContent.data, glossaryTerms: ['rascunho'] } },
    { id: 'glossary/rascunho', collection: 'glossary', body: '', data: { status: 'draft', clinical: true, riskDomains: ['clinical'], reviewer: null, reviewedAt: null, relatedTerms: [] } },
  ],
  contributors,
  records: validRecords,
}), /só pode referenciar termos de glossário approved/);
expectFailure('artigo com termo duplicado', validateEditorialState({
  contents: [
    { ...baseContent, data: { ...baseContent.data, glossaryTerms: ['aprovado', 'aprovado'] } },
    { id: 'glossary/aprovado', collection: 'glossary', body: '', data: { status: 'approved', clinical: true, riskDomains: ['clinical'], reviewer: 'clinico', reviewedAt: updatedAt, relatedTerms: [] } },
  ],
  contributors,
  records: validRecords,
}), /glossaryTerms não pode conter termos duplicados/);

const glossaryContent = {
  id: 'glossary/perda-gestacional',
  collection: 'glossary',
  body: '',
  data: {
    contentType: 'glossary-entry',
    term: 'Perda gestacional',
    slug: 'perda-gestacional',
    shortDefinition: 'Definição clínica curta.',
    fullDefinition: 'Definição clínica completa e educativa.',
    relatedTerms: [],
    status: 'approved',
    clinical: true,
    riskDomains: ['clinical'],
    authoredBy: 'autor',
    sources: [{ title: 'Fonte clínica' }],
    reviewer: 'clinico',
    reviewedAt: '2026-06-07T13:00:00.000Z',
    lastUpdatedAt: updatedAt,
    safetyReview: [],
  },
};
const glossaryRecord = (overrides) => record({ target: 'glossary/perda-gestacional', ...overrides });
const validGlossaryRecords = [
  glossaryRecord({ event: 'submitted_for_review', actor: 'submissor', role: 'author' }),
  glossaryRecord({ event: 'domain_review', actor: 'clinico', role: 'clinical_reviewer', domain: 'clinical', decision: 'approved' }),
  glossaryRecord({ event: 'editorial_approval', decision: 'approved', occurredAt: '2026-06-07T14:00:00.000Z' }),
  glossaryRecord({ event: 'status_transition', actor: 'submissor', role: 'author', fromStatus: 'in_review', toStatus: 'approved', occurredAt: '2026-06-07T15:00:00.000Z' }),
];
assert.deepEqual(failuresFor(glossaryContent, validGlossaryRecords), [], 'termo clínico válido deve passar');
expectFailure('glossário sem fonte', failuresFor({ ...glossaryContent, data: { ...glossaryContent.data, sources: [] } }, validGlossaryRecords), /termo aprovado exige ao menos uma fonte/);
expectFailure('glossário sem autoria', failuresFor({ ...glossaryContent, data: { ...glossaryContent.data, authoredBy: undefined } }, validGlossaryRecords), /termo aprovado exige autoria/);
expectFailure('glossário sem reviewer', failuresFor({ ...glossaryContent, data: { ...glossaryContent.data, reviewer: null } }, validGlossaryRecords), /termo aprovado exige reviewer/);
expectFailure('glossário revisão divergente', failuresFor({ ...glossaryContent, data: { ...glossaryContent.data, reviewedAt: '2026-06-07T13:30:00.000Z' } }, validGlossaryRecords), /corresponder à revisão clinical/);
expectFailure('glossário termo sensível na definição', failuresFor({ ...glossaryContent, data: { ...glossaryContent.data, fullDefinition: 'Definição educativa que menciona enoxaparina.' } }, validGlossaryRecords), /termo sensível "enoxaparina"/);
expectFailure('glossário slug duplicado', validateGlossaryInventory([
  glossaryContent,
  { ...glossaryContent, id: 'glossary/outro-termo', data: { ...glossaryContent.data, term: 'Outro termo' } },
]), /compartilhar slug/);
expectFailure('glossário termo relacionado inexistente', validateGlossaryInventory([
  { ...glossaryContent, data: { ...glossaryContent.data, relatedTerms: ['inexistente'] } },
]), /referencia termo inexistente/);
expectFailure('glossário termo relacionado não aprovado', validateGlossaryInventory([
  { ...glossaryContent, data: { ...glossaryContent.data, relatedTerms: ['rascunho'] } },
  { ...glossaryContent, id: 'glossary/rascunho', data: { ...glossaryContent.data, slug: 'rascunho', status: 'draft' } },
]), /só pode relacionar termos approved/);
expectFailure('glossário termo relacionado duplicado', validateGlossaryInventory([
  { ...glossaryContent, data: { ...glossaryContent.data, relatedTerms: ['outro-termo', 'outro-termo'] } },
  { ...glossaryContent, id: 'glossary/outro-termo', data: { ...glossaryContent.data, slug: 'outro-termo' } },
]), /relatedTerms não pode conter termos duplicados/);
expectFailure('glossário autorreferenciado', validateGlossaryInventory([
  { ...glossaryContent, data: { ...glossaryContent.data, relatedTerms: ['perda-gestacional'] } },
]), /não pode referenciar o próprio termo/);

const legalContent = {
  id: 'legal/privacidade',
  collection: 'legal',
  body: 'Documento jurídico aprovado.',
  data: {
    contentType: 'legal-document',
    status: 'approved',
    clinical: false,
    riskDomains: ['legal'],
    updatedAt,
    reviewer: 'juridico',
    reviewedAt: '2026-06-07T13:00:00.000Z',
    slug: 'privacidade',
  },
};
const legalRecord = (overrides) => record({ target: 'legal/privacidade', ...overrides });
const validLegalRecords = [
  legalRecord({ event: 'submitted_for_review', actor: 'submissor', role: 'author' }),
  legalRecord({ event: 'domain_review', actor: 'juridico', role: 'legal_reviewer', domain: 'legal', decision: 'approved' }),
  legalRecord({ event: 'editorial_approval', decision: 'approved', occurredAt: '2026-06-07T14:00:00.000Z' }),
  legalRecord({ event: 'status_transition', actor: 'submissor', role: 'author', fromStatus: 'in_review', toStatus: 'approved', occurredAt: '2026-06-07T15:00:00.000Z' }),
];
assert.deepEqual(failuresFor(legalContent, validLegalRecords), [], 'documento jurídico válido deve passar');
expectFailure('legal sem reviewer', failuresFor({ ...legalContent, data: { ...legalContent.data, reviewer: null } }, validLegalRecords), /exige reviewer/);
expectFailure('legal sem reviewedAt', failuresFor({ ...legalContent, data: { ...legalContent.data, reviewedAt: null } }, validLegalRecords), /exige reviewedAt/);
expectFailure('legal draft com slug', failuresFor({ ...legalContent, data: { ...legalContent.data, status: 'draft' } }, []), /não aprovado não pode declarar slug/);
expectFailure('legal revisor incompatível', failuresFor({ ...legalContent, data: { ...legalContent.data, reviewer: 'clinico' } }, validLegalRecords), /legal_reviewer|corresponder/);
expectFailure('legal data divergente', failuresFor({ ...legalContent, data: { ...legalContent.data, reviewedAt: '2026-06-07T13:30:00.000Z' } }, validLegalRecords), /corresponder à revisão legal/);
expectFailure('legalBasis vazio', failuresFor({ ...legalContent, data: { ...legalContent.data, legalBasis: [] } }, validLegalRecords), /legalBasis/);

const legalGuide = {
  id: 'legal/direitos-apos-perda-gestacional',
  collection: 'legal',
  body: 'Guia jurídico informativo e acolhedor.',
  data: {
    contentType: 'legal-guide',
    status: 'approved',
    clinical: false,
    riskDomains: ['legal'],
    updatedAt,
    authoredBy: 'autor',
    sources: [{ title: 'Fonte oficial' }],
    legalDisclaimer: 'Conteúdo informativo que não substitui orientação jurídica individual.',
    reviewer: 'juridico',
    reviewedAt: '2026-06-07T13:00:00.000Z',
  },
};
const legalGuideRecord = (overrides) => record({ target: 'legal/direitos-apos-perda-gestacional', ...overrides });
const validLegalGuideRecords = [
  legalGuideRecord({ event: 'submitted_for_review', actor: 'submissor', role: 'author' }),
  legalGuideRecord({ event: 'domain_review', actor: 'juridico', role: 'legal_reviewer', domain: 'legal', decision: 'approved' }),
  legalGuideRecord({ event: 'editorial_approval', decision: 'approved', occurredAt: '2026-06-07T14:00:00.000Z' }),
  legalGuideRecord({ event: 'status_transition', actor: 'submissor', role: 'author', fromStatus: 'in_review', toStatus: 'approved', occurredAt: '2026-06-07T15:00:00.000Z' }),
];
assert.deepEqual(failuresFor(legalGuide, validLegalGuideRecords), [], 'guia jurídico válido deve passar');
expectFailure('guia jurídico sem autoria', failuresFor({ ...legalGuide, data: { ...legalGuide.data, authoredBy: undefined } }, validLegalGuideRecords), /guia jurídico aprovado exige autoria/);
expectFailure('guia jurídico sem fonte', failuresFor({ ...legalGuide, data: { ...legalGuide.data, sources: [] } }, validLegalGuideRecords), /guia jurídico aprovado exige ao menos uma fonte/);
expectFailure('guia jurídico sem disclaimer', failuresFor({ ...legalGuide, data: { ...legalGuide.data, legalDisclaimer: '' } }, validLegalGuideRecords), /legalDisclaimer/);
expectFailure('guia jurídico com slug', failuresFor({ ...legalGuide, data: { ...legalGuide.data, slug: 'direitos' } }, validLegalGuideRecords), /rota dedicada.*não deve declarar slug/);

const legalDraft = (id) => ({ id: `legal/${id}`, collection: 'legal', body: 'Placeholder.', data: { contentType: 'legal-document', status: 'draft', reviewer: null, reviewedAt: null } });
const legalInventory = [legalDraft('privacidade'), legalDraft('termos-de-uso'), legalDraft('politica-editorial')];
assert.deepEqual(validateLegalInventory(legalInventory), [], 'inventário jurídico obrigatório deve passar');
expectFailure('documento jurídico obrigatório ausente', validateLegalInventory(legalInventory.slice(1)), /privacidade.*ausente/);
expectFailure('slug jurídico público incorreto', validateLegalInventory([
  { ...legalContent, data: { ...legalContent.data, slug: 'privacidade-interna' } },
  ...legalInventory.slice(1),
]), /slug público "privacidade"/);
expectFailure('slug jurídico duplicado', validateLegalInventory([
  legalContent,
  { ...legalContent, id: 'legal/termos-de-uso' },
  legalDraft('politica-editorial'),
]), /compartilhar slug/);

assert.deepEqual(validateEditorialState({
  contents: [{ id: 'pages/baixo-risco', collection: 'pages', body: 'Apresentação institucional.', data: { status: 'approved', clinical: false, riskDomains: [], updatedAt } }],
  contributors: [],
  records: [],
}), [], 'página institucional de baixo risco deve passar');

console.log('Testes negativos do gate editorial concluídos.');
