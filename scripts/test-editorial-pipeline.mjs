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
console.log('Testes da pipeline e do painel editorial local concluídos.');
