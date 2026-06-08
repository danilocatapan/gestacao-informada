import process from 'node:process';
import { applyReview, generateReview, listContentTargets, markDraft } from './editorial-pipeline-lib.mjs';

const root = process.cwd();
const mvpArticles = [
  'articles/entendendo-a-perda-gestacional',
  'articles/gestacao-apos-perda',
  'articles/investigacao-apos-perdas-recorrentes',
  'articles/trombofilias-hereditarias-e-adquiridas',
  'articles/sindrome-antifosfolipide',
  'articles/mthfr-evidencias-e-incertezas',
];
const [command = 'review', target, ...rest] = process.argv.slice(2);
const option = (name, fallback) => {
  const index = rest.indexOf(`--${name}`);
  return index >= 0 ? rest[index + 1] : fallback;
};

if (command === 'review') {
  if (!target) throw new Error('Informe o alvo: npm run editorial:review -- <collection/id>');
  const review = await generateReview(root, target);
  console.log(`${review.target}: ${review.decision} (${review.findings.length} apontamento(s)).`);
} else if (command === 'review-all') {
  for (const item of await listContentTargets(root)) {
    const review = await generateReview(root, item);
    console.log(`${review.target}: ${review.decision} (${review.findings.length} apontamento(s)).`);
  }
} else if (command === 'review-mvp') {
  for (const item of mvpArticles) {
    const review = await generateReview(root, item);
    console.log(`${review.target}: ${review.decision} (${review.findings.length} apontamento(s)).`);
  }
} else if (command === 'mark-draft') {
  if (!target) throw new Error('Informe o alvo.');
  const result = await markDraft(root, target, option('reason', ''), option('actor', 'equipe-editorial'));
  console.log(`${result.target}: ${result.status}.`);
} else if (command === 'apply') {
  if (!target) throw new Error('Informe o alvo.');
  const result = await applyReview(root, target);
  console.log(`${result.target}: ${result.status} (${result.decision}).`);
} else {
  throw new Error(`Comando desconhecido: ${command}`);
}
