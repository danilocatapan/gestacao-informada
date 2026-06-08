import { expect, test } from '@playwright/test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generateReview, serializeMarkdown } from '../scripts/editorial-pipeline-lib.mjs';
import { createEditorialReviewServer } from '../scripts/editorial-review-server.mjs';

const root = await mkdtemp(path.join(tmpdir(), 'gestacao-panel-v2-'));
await mkdir(path.join(root, 'src', 'content', 'articles'), { recursive: true });

const createArticle = async (id: string, body: string) => {
  await writeFile(path.join(root, 'src', 'content', 'articles', `${id}.md`), serializeMarkdown({
    title: 'Fluxo editorial v2',
    description: 'Conteúdo para validar o painel simplificado.',
    category: 'Teste',
    objective: 'Validar o painel.',
    audience: 'Público geral.',
    contentType: 'article',
    clinical: true,
    riskDomains: ['clinical'],
    status: 'draft',
    authoredBy: 'equipe-editorial',
    sources: [{ title: 'Fonte', url: 'https://example.org', publisher: 'Instituição', accessedAt: '2026-06-08', type: 'guideline' }],
    lastUpdatedAt: '2026-06-08T10:00:00.000Z',
    medicalDisclaimer: 'Conteúdo educativo.',
    safetyReview: [],
    aiAssistance: { activities: ['safety-audit'], disclosure: 'Conteúdo preparado e auditado com assistência de IA, sem revisão profissional.' },
    inspirationCredits: [],
    glossaryTerms: [],
  }, body), 'utf8');
  await generateReview(root, `articles/${id}`);
};

await createArticle('fluxo', 'Este conteúdo aguarda revisão profissional.');
await createArticle('bloqueado', 'Este tratamento garante resultado.');
const app = createEditorialReviewServer({ root, port: 4187, token: 'token-editorial-v2' });

test.beforeAll(async () => {
  await new Promise<void>((resolve) => app.server.listen(app.port, app.host, resolve));
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => app.server.close((error) => error ? reject(error) : resolve()));
});

test.beforeEach(async ({ page }) => {
  await page.goto(app.origin);
});

test('painel simplificado registra escalada e OK do mantenedor', async ({ page }) => {
  await expect(page.getByText('Pareceres v2')).toBeVisible();
  await page.getByRole('button', { name: /articles\/fluxo/ }).click();
  await expect(page.locator('.meta').getByText(/owner_review_required/)).toBeVisible();
  await page.locator('.finding[data-kind="escalation"] .reason').fill('A menção será mantida como contexto histórico.');
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/resolve')),
    page.getByRole('button', { name: 'Manter e escalar ao mantenedor' }).click(),
  ]);
  await expect(page.getByRole('button', { name: 'Aplicar decisões editoriais' })).toBeEnabled();
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/apply')),
    page.getByRole('button', { name: 'Aplicar decisões editoriais' }).click(),
  ]);
  await expect(page.getByRole('heading', { name: 'OK do mantenedor' })).toBeVisible();
  await page.getByPlaceholder('Estou ciente e aprovo').fill('Estou ciente e aprovo');
  await page.locator('#owner-justification').fill('Estou ciente da escalada registrada e aprovo esta versão.');
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/owner-approve')),
    page.getByRole('button', { name: 'Estou ciente e aprovo' }).click(),
  ]);
  await expect(page.locator('.meta').getByText(/approved_for_publication/)).toBeVisible();
  await page.screenshot({ path: 'docs/qa/screenshots/painel-editorial-fluxo-desktop.png', fullPage: true });
});

test('bloqueio objetivo não oferece override', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole('button', { name: /articles\/bloqueado/ }).click();
  const blocker = page.locator('.finding[data-kind="blocker"]');
  await expect(blocker).toBeVisible();
  await expect(blocker.getByRole('button', { name: 'Manter e escalar ao mantenedor' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'OK do mantenedor' })).toHaveCount(0);
  await page.screenshot({ path: 'docs/qa/screenshots/painel-editorial-mobile.png', fullPage: true });
});
