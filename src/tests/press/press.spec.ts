import { test, expect } from '@/utils/fixtures/appBaseTest';

const baseUrl = process.env.STACK === 'stg' ? 'https://stg.ltvco.com'
  : process.env.STACK === 'dev' ? 'https://dev.ltvco.com'
  : 'https://www.ltvco.com';

test.describe('Press Page', () => {

  // Steps:
  // 1. Navigate to /press/
  // 2. Verify URL contains /press/
  // 3. Verify page body is visible
  test('should load the Press page successfully', async ({ appActions, page }) => {
    await appActions.openPage('/press/');
    await appActions.expectPageUrlContains('press');
    await expect(page.locator('body')).toBeVisible();
  });

  // Steps:
  // 1. Navigate to /press/
  // 2. Verify the h1 heading contains "Press"
  test('should display the Press page heading', async ({ appActions, page }) => {
    await appActions.openPage('/press/');
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Press');
  });

  // Steps:
  // 1. Navigate to /press/
  // 2. Verify the navigation container is present in the DOM
  // 3. Verify nav contains at least one link
  test('should display navigation links', async ({ appActions, page }) => {
    await appActions.openPage('/press/');
    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeAttached();
    const count = await nav.locator('a').count();
    expect(count).toBeGreaterThan(0);
  });

  // Steps:
  // 1. Navigate to /press/
  // 2. Verify media contact information is present on the page
  test('should display media contact information', async ({ appActions }) => {
    await appActions.openPage('/press/');
    await appActions.expectPageBodyContains('Media');
  });

  // Steps:
  // 1. Navigate to /press/
  // 2. Verify the contact email link is present in the DOM
  test('should display a media contact email link', async ({ appActions, page }) => {
    await appActions.openPage('/press/');
    const emailLink = page.locator('a[href^="mailto:"]').first();
    await expect(emailLink).toBeAttached();
  });

  // Steps:
  // 1. Navigate to /press/
  // 2. Verify press coverage article links exist in the main content area
  test('should display press coverage items', async ({ appActions, page }) => {
    await appActions.openPage('/press/');
    const articleLinks = page.locator('main a, [class*="press"] a, [class*="article"] a').filter({ hasText: /.{10,}/ });
    const count = await articleLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  // Steps:
  // 1. Navigate to /press/
  // 2. Verify year filter dropdown is present
  // 3. Verify it has multiple year options
  test('should display the year filter dropdown', async ({ appActions, page }) => {
    await appActions.openPage('/press/');
    const selects = page.locator('select');
    const count = await selects.count();
    expect(count).toBeGreaterThan(0);
    const options = selects.first().locator('option');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1);
  });

  // Steps:
  // 1. Navigate to /press/
  // 2. Verify brand filter dropdown is present with multiple options
  test('should display the brand filter dropdown', async ({ appActions, page }) => {
    await appActions.openPage('/press/');
    const selects = page.locator('select');
    expect(await selects.count()).toBeGreaterThanOrEqual(2);
    const brandSelect = selects.nth(1);
    const optionCount = await brandSelect.locator('option').count();
    expect(optionCount).toBeGreaterThan(1);
  });

  // Steps:
  // 1. Navigate to /press/
  // 2. Select the second option in the year filter (first non-default year)
  // 3. Verify the page stays on /press/
  test('should apply year filter without leaving the page', async ({ appActions, page }) => {
    await appActions.openPage('/press/');
    const yearSelect = page.locator('select').first();
    await yearSelect.selectOption({ index: 1 });
    await appActions.expectPageUrlContains('press');
  });

  // Steps:
  // 1. Navigate to /press/
  // 2. Select the second option in the brand filter (first non-default brand)
  // 3. Verify the page stays on /press/
  test('should apply brand filter without leaving the page', async ({ appActions, page }) => {
    await appActions.openPage('/press/');
    const selects = page.locator('select');
    if (await selects.count() >= 2) {
      await selects.nth(1).selectOption({ index: 1 });
    }
    await appActions.expectPageUrlContains('press');
  });

  // Steps:
  // 1. Navigate to /press/
  // 2. Verify coverage from known LTVco brands is present
  test('should display press coverage from known brands', async ({ appActions }) => {
    await appActions.openPage('/press/');
    await appActions.expectPageBodyContains('Bumper');
  });

  // Steps:
  // 1. Navigate to /press/
  // 2. Verify pagination controls or a next-page link is present
  test('should display pagination controls', async ({ appActions, page }) => {
    await appActions.openPage('/press/');
    const paginationEl = page.locator('[class*="pagination"], [class*="pager"], [aria-label*="pagination"]');
    const nextLink = page.locator('a').filter({ hasText: /next/i });
    const hasPagination = (await paginationEl.count()) > 0 || (await nextLink.count()) > 0;
    expect(hasPagination).toBeTruthy();
  });

  // Steps:
  // 1. Navigate to /press/
  // 2. Verify the footer is visible
  // 3. Verify copyright notice contains 2026
  test('should display footer with copyright', async ({ appActions, page }) => {
    await appActions.openPage('/press/');
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
    await appActions.expectPageBodyContains('2026');
  });

  // Steps:
  // 1. Navigate to /press/
  // 2. Verify social media links are present in the footer
  test('should display social media links in the footer', async ({ appActions, page }) => {
    await appActions.openPage('/press/');
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
    const socialLinks = footer.locator('a');
    const count = await socialLinks.count();
    expect(count).toBeGreaterThan(0);
  });

});

test.describe('Press Page — Performance Audit', () => {

  // Steps:
  // 1. Run Lighthouse desktop audit against /press/
  // 2. Verify performance ≥ 50, accessibility ≥ 85, best-practices ≥ 90, seo ≥ 85
  test('desktop audit meets thresholds', async ({ audit }) => {
    await audit(`${baseUrl}/press/`);
  });

  // Steps:
  // 1. Run Lighthouse mobile audit against /press/
  // 2. Verify performance ≥ 25, accessibility ≥ 85, best-practices ≥ 90, seo ≥ 85
  test('mobile audit meets thresholds', async ({ auditMobile }) => {
    await auditMobile(`${baseUrl}/press/`);
  });

});
