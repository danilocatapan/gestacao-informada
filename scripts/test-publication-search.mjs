import assert from 'node:assert/strict';
import {
  MIN_APPROVED_ARTICLES_FOR_GLOSSARY,
  MIN_APPROVED_GLOSSARY_TERMS_FOR_LAUNCH,
  canPublishGlossary,
} from '../src/lib/publication.ts';
import { deduplicateSearchItems } from '../src/lib/search.ts';

assert.equal(MIN_APPROVED_ARTICLES_FOR_GLOSSARY, 6);
assert.equal(MIN_APPROVED_GLOSSARY_TERMS_FOR_LAUNCH, 6);
assert.equal(canPublishGlossary(5, 6), false, 'seis termos sem seis artigos não liberam o marco');
assert.equal(canPublishGlossary(6, 5), false, 'seis artigos sem seis termos não liberam o marco');
assert.equal(canPublishGlossary(6, 6), true, 'o marco 6+6 deve liberar glossário e busca');
assert.equal(canPublishGlossary(7, 8), true, 'contagens acima do marco devem permanecer publicáveis');

const first = { title: 'Primeiro', summary: 'Resumo', url: '/primeiro/', type: 'Página', text: 'Texto' };
const replacement = { ...first, title: 'Versão final' };
const second = { title: 'Segundo', summary: 'Resumo', url: '/segundo/', type: 'Artigo', text: 'Texto' };
assert.deepEqual(
  deduplicateSearchItems([first, second, replacement]),
  [replacement, second],
  'o índice deve manter uma única entrada por URL',
);

console.log('Testes do marco editorial e do índice de busca concluídos.');
