import { test, expect } from '@/utils/fixtures/appBaseTest';

test.describe('Homepage', () => {
  // Steps:
  // 1. Navigate to the homepage
  // 2. Verify the page loads successfully
  // 3. Verify the page URL is correct
  test('Homepage — should load and display main content', async ({ appActions, page }) => {
    await appActions.openPage('/');
    await appActions.expectPageIsVisible();
    await appActions.expectPageUrlContains('ltvco.com');
    
    // Verify page has content (at least a heading or main element)
    const mainContent = page.locator('main, [role="main"], h1').first();
    await expect(mainContent).toBeVisible();
  });

  // Steps:
  // 1. Navigate to the homepage
  // 2. Verify the page has valid structure and headings
  test('Homepage — should have valid page structure', async ({ appActions, page }) => {
    await appActions.openPage('/');
    const body = page.locator('body');
    
    // Verify body element exists and is visible
    await expect(body).toBeVisible();
    
    // Verify page has at least one heading
    const headings = page.locator('h1, h2, h3').first();
    await expect(headings).toBeVisible();
  });

  // Steps:
  // 1. Verify base URL is correctly configured
  // 2. Navigate to the homepage
  // 3. Verify page loads successfully
  test('Homepage — should use correct base URL', async ({ appActions }) => {
    const baseURL = appActions.getBaseURL();
    expect(baseURL).toBeTruthy();
    expect(baseURL).toContain('ltvco.com');
    
    await appActions.openPage('/');
    await appActions.expectPageIsVisible();
  });
});
