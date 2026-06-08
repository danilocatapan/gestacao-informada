import process from 'node:process';
import { generateReview, listContentTargets, markDraft } from './editorial-pipeline-lib.mjs';

const root = process.cwd();
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
} else if (command === 'mark-draft') {
  if (!target) throw new Error('Informe o alvo.');
  const result = await markDraft(root, target, option('reason', ''), option('actor', 'equipe-editorial'));
  console.log(`${result.target}: ${result.status}.`);
} else {
  throw new Error(`Comando desconhecido: ${command}`);
}
