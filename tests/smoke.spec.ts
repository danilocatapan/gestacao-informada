import { expect, test } from '@playwright/test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const routes = {
  inicio: '',
  artigos: 'artigos/',
  busca: 'busca/',
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

if (!glossaryPublished) {
  test('glossário permanece bloqueado antes do marco editorial', async ({ page }) => {
    expect((await page.goto('glossario/'))?.status()).toBe(404);
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

        const currentNavigationLink = page.locator(`nav[aria-label="Navegação principal"] a[href$="/${route}"]`);
        if (route && await currentNavigationLink.count() > 0) {
          await expect(currentNavigationLink).toHaveAttribute('aria-current', 'page');
        }
        if (route && route !== 'artigos/' && route !== 'busca/') {
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
    await expect(navigation.locator('a')).toHaveCount(4);

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

test.describe('jornadas principais', () => {
  test('acolhimento oferece ajuda imediata em um clique a partir da home', async ({ page }) => {
    await page.goto('');
    await page.getByRole('link', { name: 'Preciso de acolhimento' }).click();
    await expect(page.locator('.immediate-support')).toBeVisible();
    await expect(page.getByRole('link', { name: 'SAMU 192' })).toHaveAttribute('href', /gov\.br/);
    await expect(page.getByRole('link', { name: /CVV atende gratuitamente/ })).toHaveAttribute('href', /gov\.br/);
  });

  test('pessoa encontra artigo introdutório em até dois cliques', async ({ page }) => {
    await page.goto('');
    await page.getByRole('link', { name: 'Quero entender o que aconteceu' }).click();
    await page.getByRole('link', { name: 'Entendendo a perda gestacional' }).click();
    await expect(page.locator('main h1')).toHaveText('Entendendo a perda gestacional');
  });

  test('pessoa encontra investigação recorrente em até dois cliques', async ({ page }) => {
    await page.goto('');
    await page.getByRole('link', { name: 'Explorar a investigação' }).click();
    await page.getByRole('link', { name: 'Investigação após perdas recorrentes' }).click();
    await expect(page.locator('main h1')).toHaveText('Investigação após perdas recorrentes');
  });

  test('vitrine exibe somente os seis artigos aprovados', async ({ page }) => {
    await page.goto('artigos/');
    await expect(page.locator('.article-card')).toHaveCount(6);
    await expect(page.getByText('Princípios para futuros conteúdos clínicos')).toHaveCount(0);
  });

  test('home prioriza leituras introdutórias antes de temas complexos', async ({ page }) => {
    await page.goto('');
    const highlights = page.locator('.article-highlight .article-card');
    await expect(highlights).toHaveCount(3);
    await expect(highlights.nth(0)).toContainText('Entendendo a perda gestacional');
    await expect(highlights.nth(1)).toContainText('Gestação após perda');
    await expect(highlights.nth(2)).toContainText('Investigação após perdas recorrentes');
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

        const response = await page.goto(`/gestacao-informada/${articleRoute}`);
        expect(response?.ok()).toBeTruthy();
        await expect(page.locator('main h1')).toBeVisible();
        await expect(page.locator('.article-meta')).toContainText('Fontes');
        await expect(page.locator('.article-meta')).toContainText('Assistência por IA');
        await expect(page.locator('[data-ai-disclosure]')).toBeVisible();
        await expect(page.locator('[data-review-transparency]')).toContainText('revisão profissional');
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
          await page.goto(`/gestacao-informada/${route}`);
          await expect(page.locator('[data-glossary-entry]')).toBeVisible();
          await expect(page.locator('[data-review-transparency]')).toContainText('sem revisão profissional');
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
        await page.screenshot({ path: `docs/qa/screenshots/busca-${viewport.name}.png`, fullPage: true });

        await input.fill('termo-sem-resultado-publicado');
        await input.press('Enter');
        await expect(page.locator('.search-status')).toHaveText('Nenhum resultado encontrado.');
        expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
        expect(errors).toEqual([]);
      });
    }
  });
}
