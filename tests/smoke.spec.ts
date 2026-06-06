import { expect, test } from '@playwright/test';

const routes = {
  inicio: '',
  'entender-a-perda': 'entender-a-perda/',
  'trombofilias-e-investigacao': 'trombofilias-e-investigacao/',
  'acolhimento-e-luto': 'acolhimento-e-luto/',
  direitos: 'direitos/',
  materiais: 'materiais/',
  sobre: 'sobre/',
};

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 360, height: 800 },
]) {
  test.describe(viewport.name, () => {
    test.use({ viewport });

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
        await expect(page.locator('nav[aria-label="Navegação principal"]')).toBeVisible();

        const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(hasOverflow).toBeFalsy();
        expect(errors).toEqual([]);
        await page.screenshot({ path: `docs/qa/screenshots/${name}-${viewport.name}.png`, fullPage: true });
      });
    }
  });
}
