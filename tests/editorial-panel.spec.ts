import { expect, test } from '@playwright/test';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createEditorialReviewServer } from '../scripts/editorial-review-server.mjs';
import {
  generateReview,
  readContent,
  serializeMarkdown,
} from '../scripts/editorial-pipeline-lib.mjs';

const port = 4191;
let root: string;
let origin: string;
let server: ReturnType<typeof createEditorialReviewServer>['server'];

const baseData = {
  title: 'Conteúdo editorial de teste',
  contentType: 'article',
  clinical: true,
  riskDomains: ['clinical'],
  status: 'draft',
  lastUpdatedAt: '2026-06-08',
  medicalDisclaimer: 'Conteúdo educativo.',
};

async function createArticle(id: string, body: string) {
  await writeFile(
    path.join(root, 'src', 'content', 'articles', `${id}.md`),
    serializeMarkdown({ ...baseData, title: `Conteúdo ${id}` }, body),
    'utf8',
  );
  await generateReview(root, `articles/${id}`);
}

test.beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'gestacao-editorial-e2e-'));
  await mkdir(path.join(root, 'src', 'content', 'articles'), { recursive: true });
  await mkdir(path.join(root, 'src', 'content', 'editorial-records'), { recursive: true });

  await createArticle('fluxo-completo', 'Este texto garante resultado.\nExiste uma pendência humana documentada.\n');
  await createArticle('rejeicao-bloqueante', 'Este texto garante resultado.\n');
  await createArticle('parecer-obsoleto', 'Existe uma pendência humana documentada.\n');

  const app = createEditorialReviewServer({ root, port, token: 'token-e2e-editorial' });
  server = app.server;
  origin = app.origin;
  await new Promise<void>((resolve) => server.listen(app.port, app.host, resolve));
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await rm(root, { recursive: true, force: true });
});

test('fluxo completo resolve apontamentos e envia somente para in_review', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(origin);
  await expect(page.getByText('Somente em 127.0.0.1. Nenhuma ação publica conteúdo.')).toBeVisible();
  await page.getByRole('button', { name: /articles\/fluxo-completo/ }).click();

  await expect(page.locator('.article mark')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Aplicar alterações e enviar para revisão' })).toBeDisabled();

  const mediumFinding = page.locator('.finding[data-severity="medium"]');
  await mediumFinding.locator('.reason').fill('A pendência humana continuará registrada para os revisores.');
  await mediumFinding.getByRole('button', { name: 'Rejeitar com justificativa' }).click();
  await expect(page.locator('#status')).toHaveText('Decisão salva.');

  const criticalFinding = page.locator('.finding[data-severity="critical"]');
  await criticalFinding.locator('textarea').first().fill('pode ajudar a compreender possibilidades');
  await criticalFinding.getByRole('button', { name: 'Aceitar ajuste' }).click();
  await expect(page.locator('#status')).toHaveText('Decisão salva.');

  const apply = page.getByRole('button', { name: 'Aplicar alterações e enviar para revisão' });
  await expect(apply).toBeEnabled();
  await apply.click();
  await expect(page.locator('#status')).toHaveText('Aplicado. Novo status: in_review');

  const content = await readContent(root, 'articles/fluxo-completo');
  expect(content.data.status).toBe('in_review');
  expect(content.body).toContain('pode ajudar a compreender possibilidades');
  expect(content.body).not.toContain('garante');
  expect(await readdir(path.join(root, 'src', 'content', 'editorial-records'))).toHaveLength(2);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'docs/qa/screenshots/painel-editorial-fluxo-desktop.png', fullPage: true });
});

test('rejeição de apontamento crítico mantém o envio bloqueado', async ({ page }) => {
  await page.goto(origin);
  await page.getByRole('button', { name: /articles\/rejeicao-bloqueante/ }).click();

  const finding = page.locator('.finding[data-severity="critical"]');
  await finding.locator('.reason').fill('A sugestão precisa ser reavaliada antes de qualquer envio.');
  await finding.getByRole('button', { name: 'Rejeitar com justificativa' }).click();

  await expect(page.locator('#status')).toHaveText('Decisão salva.');
  await expect(page.getByRole('button', { name: 'Aplicar alterações e enviar para revisão' })).toBeDisabled();
  expect((await readContent(root, 'articles/rejeicao-bloqueante')).data.status).toBe('draft');
});

test('conteúdo alterado depois do parecer não pode ser aplicado', async ({ page }) => {
  await page.goto(origin);
  await page.getByRole('button', { name: /articles\/parecer-obsoleto/ }).click();

  const finding = page.locator('.finding[data-severity="medium"]');
  await finding.locator('textarea').first().fill('Existe uma confirmação humana documentada.');
  await finding.getByRole('button', { name: 'Aceitar ajuste' }).click();
  await expect(page.getByRole('button', { name: 'Aplicar alterações e enviar para revisão' })).toBeEnabled();

  const content = await readContent(root, 'articles/parecer-obsoleto');
  await writeFile(content.file, `${content.source}\nAlteração externa.\n`, 'utf8');
  await page.getByRole('button', { name: 'Aplicar alterações e enviar para revisão' }).click();

  await expect(page.locator('#status')).toContainText('O conteúdo mudou após a geração do parecer');
  expect((await readContent(root, 'articles/parecer-obsoleto')).data.status).toBe('draft');
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('painel permanece acessível e sem overflow', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(origin);
    await page.getByRole('button', { name: /articles\/rejeicao-bloqueante/ }).click();
    await expect(page.getByRole('heading', { name: 'Conteúdo rejeicao-bloqueante' })).toBeVisible();
    await expect(page.locator('#status')).toHaveAttribute('aria-live', 'polite');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
    expect(errors).toEqual([]);
    await page.screenshot({ path: 'docs/qa/screenshots/painel-editorial-fluxo-mobile.png', fullPage: true });
  });
});
