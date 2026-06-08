import { expect, test } from '@playwright/test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const routes = {
  inicio: '',
  'entender-a-perda': 'entender-a-perda/',
  'trombofilias-e-investigacao': 'trombofilias-e-investigacao/',
  'acolhimento-e-luto': 'acolhimento-e-luto/',
  direitos: 'direitos/',
  materiais: 'materiais/',
  sobre: 'sobre/',
};

const rightsHtmlPath = path.join(process.cwd(), 'dist', 'direitos', 'index.html');
const rightsGuidePublished = existsSync(rightsHtmlPath) && readFileSync(rightsHtmlPath, 'utf8').includes('data-legal-guide');
const notices = {
  'entender-a-perda/': 'clinical',
  'trombofilias-e-investigacao/': 'clinical',
  'acolhimento-e-luto/': 'psychological',
  ...(!rightsGuidePublished ? { 'direitos/': 'legal' } : {}),
};

const articlesDirectory = path.join(process.cwd(), 'dist', 'artigos');
const approvedArticleRoutes = existsSync(articlesDirectory)
  ? readdirSync(articlesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `artigos/${entry.name}/`)
  : [];
const glossaryDirectory = path.join(process.cwd(), 'dist', 'glossario');
const approvedGlossaryRoutes = existsSync(glossaryDirectory)
  ? readdirSync(glossaryDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `glossario/${entry.name}/`)
  : [];
const glossaryPublished = existsSync(path.join(glossaryDirectory, 'index.html'));
const searchIndexPath = path.join(process.cwd(), 'dist', 'busca', 'indice.json');
const searchPublished = existsSync(path.join(process.cwd(), 'dist', 'busca', 'index.html')) && existsSync(searchIndexPath);
const searchItems = searchPublished ? JSON.parse(readFileSync(searchIndexPath, 'utf8')) as { title: string; url: string }[] : [];

if (!glossaryPublished && !searchPublished) {
  test('glossário e busca permanecem bloqueados antes dos marcos editoriais', async ({ page }) => {
    expect((await page.goto('glossario/'))?.status()).toBe(404);
    expect((await page.goto('busca/'))?.status()).toBe(404);
    expect((await page.goto('busca/indice.json'))?.status()).toBe(404);
  });
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 360, height: 800 },
]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const [name, route] of Object.entries(routes)) {
      test(`${name} carrega sem erros ou overflow`, async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        page.on('pageerror', (error) => errors.push(error.message));

        const response = await page.goto(route);
        expect(response?.ok()).toBeTruthy();
        await expect(page.locator('main h1')).toBeVisible();

        const navigation = page.locator('nav[aria-label="Navegação principal"]');
        if (viewport.name === 'mobile') {
          await expect(page.locator('.menu-toggle')).toBeVisible();
          await expect(navigation).toBeHidden();
        } else {
          await expect(navigation).toBeVisible();
        }

        if (route) {
          await expect(page.locator(`nav[aria-label="Navegação principal"] a[href$="/${route}"]`)).toHaveAttribute('aria-current', 'page');
          await expect(page.locator('.next-steps')).toBeVisible();
        }

        const expectedNotice = notices[route as keyof typeof notices];
        if (expectedNotice) {
          await expect(page.locator('.notice')).toHaveAttribute('data-notice-kind', expectedNotice);
          const noticePrecedesArticle = await page.locator('.article-grid').evaluate((grid) => {
            const notice = grid.querySelector('.notice');
            const article = grid.querySelector('article');
            return Boolean(notice && article && (notice.compareDocumentPosition(article) & Node.DOCUMENT_POSITION_FOLLOWING));
          });
          expect(noticePrecedesArticle).toBeTruthy();
        }
        if (route === 'direitos/' && rightsGuidePublished) {
          await expect(page.locator('[data-legal-guide]')).toBeVisible();
          await expect(page.locator('[data-legal-guide] .article-meta')).toContainText('Fontes oficiais consultadas');
          await expect(page.locator('[data-legal-guide] .article-meta')).toContainText('não substitui orientação jurídica');
        }

        const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(hasOverflow).toBeFalsy();
        expect(errors).toEqual([]);
        await page.screenshot({ path: `docs/qa/screenshots/${name}-${viewport.name}.png`, fullPage: true });
      });
    }
  });
}

test.describe('interações mobile', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('menu abre, possui alvos adequados e fecha com Escape', async ({ page }) => {
    await page.goto('entender-a-perda/');
    const toggle = page.locator('.menu-toggle');
    const navigation = page.locator('nav[aria-label="Navegação principal"]');

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(navigation).toBeVisible();

    const linkHeights = await navigation.locator('a').evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height));
    expect(linkHeights.every((height) => height >= 44)).toBeTruthy();

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(navigation).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test('checklist oferece impressão sem persistência', async ({ page }) => {
    await page.goto('materiais/');
    await page.evaluate(() => {
      (window as typeof window & { printCalled?: boolean }).print = () => {
        (window as typeof window & { printCalled?: boolean }).printCalled = true;
      };
    });
    await page.getByRole('button', { name: 'Imprimir checklist' }).click();
    expect(await page.evaluate(() => (window as typeof window & { printCalled?: boolean }).printCalled)).toBeTruthy();
    await expect(page.getByText('O checklist não salva nem envia informações.')).toBeVisible();
  });
});

for (const articleRoute of approvedArticleRoutes) {
  test.describe(`artigo aprovado: ${articleRoute}`, () => {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile', width: 360, height: 800 },
    ]) {
      test(`${viewport.name} apresenta metadados editoriais e não possui erros`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const errors: string[] = [];
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        page.on('pageerror', (error) => errors.push(error.message));

        const response = await page.goto(articleRoute);
        expect(response?.ok()).toBeTruthy();
        await expect(page.locator('main h1')).toBeVisible();
        await expect(page.locator('.article-meta')).toContainText('Fontes');
        await expect(page.locator('.article-meta')).toContainText('Assistência por IA');
        await expect(page.locator('[data-ai-disclosure]')).toBeVisible();
        await expect(page.locator('.article-meta')).toContainText('não substitui');

        const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(hasOverflow).toBeFalsy();
        expect(errors).toEqual([]);
        await page.screenshot({
          path: `docs/qa/screenshots/artigo-${articleRoute.split('/')[1]}-${viewport.name}.png`,
          fullPage: true,
        });
      });
    }
  });
}

if (glossaryPublished) {
  test.describe('glossário publicado', () => {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile', width: 360, height: 800 },
    ]) {
      test(`${viewport.name} apresenta índice e termos aprovados`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const errors: string[] = [];
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        page.on('pageerror', (error) => errors.push(error.message));

        await page.goto('glossario/');
        await expect(page.locator('[data-glossary-index]')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Glossário' })).toHaveAttribute('aria-current', 'page');
        expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();

        for (const route of approvedGlossaryRoutes) {
          await page.goto(route);
          await expect(page.locator('[data-glossary-entry]')).toBeVisible();
          await expect(page.locator('.article-meta')).toContainText('Revisão clínica');
          await expect(page.locator('.article-meta')).toContainText('Fontes');
        }
        expect(errors).toEqual([]);
        await page.screenshot({ path: `docs/qa/screenshots/glossario-${viewport.name}.png`, fullPage: true });
      });
    }
  });
}

if (searchPublished && searchItems.length > 0) {
  test.describe('busca publicada', () => {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile', width: 360, height: 800 },
    ]) {
      test(`${viewport.name} busca conteúdo aprovado e apresenta estados acessíveis`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const errors: string[] = [];
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        page.on('pageerror', (error) => errors.push(error.message));

        const item = searchItems[0];
        const normalizedTitle = item.title.normalize('NFD').replace(/\p{Diacritic}/gu, '');
        await page.goto('busca/');
        const input = page.getByLabel('O que você procura?');
        await expect(page.locator('.search-status')).toHaveText('Digite um termo para começar.');
        await input.fill(normalizedTitle);
        await input.press('Enter');
        await expect(page.locator('.search-status')).toContainText('resultado');
        await expect(page.locator('.search-results a').first()).toBeVisible();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await expect(page.locator('.search-results a').first()).toBeFocused();

        await input.fill('termo-sem-resultado-publicado');
        await input.press('Enter');
        await expect(page.locator('.search-status')).toHaveText('Nenhum resultado encontrado.');
        expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
        expect(errors).toEqual([]);
        await page.screenshot({ path: `docs/qa/screenshots/busca-${viewport.name}.png`, fullPage: true });
      });
    }
  });
}
