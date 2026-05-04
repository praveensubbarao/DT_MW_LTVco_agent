import { test, expect } from '@/utils/fixtures/appBaseTest';

const baseUrl = process.env.STACK === 'stg' ? 'https://stg.ltvco.com'
  : process.env.STACK === 'dev' ? 'https://dev.ltvco.com'
  : 'https://www.ltvco.com';

test.describe('Partners Page', () => {

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify page loads and URL contains /partners/
  // 3. Verify page body is visible
  test('should load the Partners page successfully', async ({ appActions, page }) => {
    await appActions.openPage('/partners/');
    await appActions.expectPageUrlContains('partners');
    await expect(page.locator('body')).toBeVisible();
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify the hero headline is visible
  test('should display the hero headline', async ({ appActions }) => {
    await appActions.openPage('/partners/');
    await appActions.expectPageBodyContains('Monetize Your Traffic');
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify the nav element exists in the DOM
  // 3. Verify nav contains at least one link
  test('should display navigation links', async ({ appActions, page }) => {
    await appActions.openPage('/partners/');
    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeAttached();
    const count = await nav.locator('a').count();
    expect(count).toBeGreaterThan(0);
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify "Apply to Become a partner" CTA appears at least once
  test('should display Apply to Become a Partner CTA', async ({ appActions, page }) => {
    await appActions.openPage('/partners/');
    const applyLinks = page.locator('a, button').filter({ hasText: /apply to become a partner/i });
    const count = await applyLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify "Contact Us" link exists in DOM (may be hidden in collapsed nav on mobile)
  test('should display the Contact Us CTA', async ({ appActions, page }) => {
    await appActions.openPage('/partners/');
    const contactLink = page.locator('a[href*="contact"]');
    await expect(contactLink.first()).toBeAttached();
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify "Aligned with Leading Partners" section heading is present
  // 3. Verify known partner names Tune, Perform Media, Top10.com are in the page
  test('should display the Aligned with Leading Partners section', async ({ appActions }) => {
    await appActions.openPage('/partners/');
    await appActions.expectPageBodyContains('Aligned with Leading Partners');
    await appActions.expectPageBodyContains('Tune');
    await appActions.expectPageBodyContains('Perform Media');
    await appActions.expectPageBodyContains('Top10.com');
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify "How it Works" section heading is visible
  test('should display the How it Works section', async ({ appActions }) => {
    await appActions.openPage('/partners/');
    await appActions.expectPageBodyContains('How it Works');
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify "Why Partners choose LTVCo." section is present
  test('should display the Why Partners Choose LTVCo section', async ({ appActions }) => {
    await appActions.openPage('/partners/');
    await appActions.expectPageBodyContains('Why Partners choose LTVCo');
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify the Partners Program statistics section is present
  test('should display the Partners Program by the Numbers section', async ({ appActions }) => {
    await appActions.openPage('/partners/');
    await appActions.expectPageBodyContains('Partners Program by the Numbers');
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify the brands section heading is visible
  // 3. Verify the category filter structure (People Search, Vehicle Data, Property Data) is present
  test('should display the brand gallery section with filter structure', async ({ appActions, page }) => {
    await appActions.openPage('/partners/');
    await appActions.expectPageBodyContains('Promote Trusted Brands That Convert');
    // Filter tab labels exist in DOM (proven by the brand filter tabs test)
    await expect(page.locator('body').getByText('People Search', { exact: false }).first()).toBeAttached();
    await expect(page.locator('body').getByText('Vehicle Data', { exact: false }).first()).toBeAttached();
    await expect(page.locator('body').getByText('Property Data', { exact: false }).first()).toBeAttached();
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify the brand filter tab labels exist in DOM (hidden via is-hidden-mobile on small screens)
  test('should display brand category filter tabs', async ({ appActions, page }) => {
    await appActions.openPage('/partners/');
    await expect(page.locator('body').getByText('People Search', { exact: false }).first()).toBeAttached();
    await expect(page.locator('body').getByText('Vehicle Data', { exact: false }).first()).toBeAttached();
    await expect(page.locator('body').getByText('Property Data', { exact: false }).first()).toBeAttached();
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Click the "People Search" filter tab
  // 3. Verify the page stays on /partners/ (filter applied without navigation)
  test('should apply People Search category filter without navigating away', async ({ appActions, page }) => {
    await appActions.openPage('/partners/');
    const peopleSearchTab = page.locator('li, div, button, a').filter({ hasText: /people search/i }).first();
    await expect(peopleSearchTab).toBeAttached();
    await peopleSearchTab.click();
    await appActions.expectPageUrlContains('partners');
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify "Payout & Terms" section heading is present
  test('should display the Payout and Terms section', async ({ appActions }) => {
    await appActions.openPage('/partners/');
    await appActions.expectPageBodyContains('Payout');
    await appActions.expectPageBodyContains('Terms');
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify "What Our Partners Say" testimonials section is present
  test('should display the testimonials section', async ({ appActions }) => {
    await appActions.openPage('/partners/');
    await appActions.expectPageBodyContains('What Our Partners Say');
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify the FAQ section heading is present
  // 3. Verify FAQ items exist in the DOM
  test('should display the FAQ section', async ({ appActions, page }) => {
    await appActions.openPage('/partners/');
    await appActions.expectPageBodyContains('Frequently Asked Questions');
    const faqItems = page.locator('[class*="faq"], [class*="accordion"], details, [aria-expanded]');
    const count = await faqItems.count();
    expect(count).toBeGreaterThan(0);
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify the final CTA "Ready to Monetize Your Traffic?" is present
  test('should display the final CTA section', async ({ appActions }) => {
    await appActions.openPage('/partners/');
    await appActions.expectPageBodyContains('Ready to Monetize Your Traffic');
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify contact information for Taylor Weibert is present
  test('should display partner contact information', async ({ appActions }) => {
    await appActions.openPage('/partners/');
    await appActions.expectPageBodyContains('Taylor Weibert');
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Verify the footer is visible
  // 3. Verify social media links exist in the footer
  test('should display the footer with social media links', async ({ appActions, page }) => {
    await appActions.openPage('/partners/');
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
    const socialLinks = footer.locator('a');
    const count = await socialLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  // Steps:
  // 1. Navigate to /partners/
  // 2. Click the "Apply to Become a partner" primary CTA
  // 3. Verify navigation or modal occurs (URL change or form appears)
  test('should navigate when Apply to Become a Partner CTA is clicked', async ({ appActions, page }) => {
    await appActions.openPage('/partners/');
    const applyLink = page.locator('a').filter({ hasText: /apply to become a partner/i }).first();
    await expect(applyLink).toBeAttached();
    await applyLink.click();
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    const navigated = currentUrl !== 'https://www.ltvco.com/partners/' && currentUrl !== 'https://www.ltvco.com/partners';
    const hasForm = await page.locator('form').count() > 0;
    expect(navigated || hasForm).toBeTruthy();
  });

});

test.describe('Partners Page — Performance Audit', () => {

  // Steps:
  // 1. Run Lighthouse desktop audit against the Partners page
  // 2. Verify performance ≥ 50, accessibility ≥ 90, best-practices ≥ 90, seo ≥ 90
  test('desktop audit meets thresholds', async ({ audit }) => {
    await audit(`${baseUrl}/partners/`);
  });

  // Steps:
  // 1. Run Lighthouse mobile audit against the Partners page
  // 2. Verify performance ≥ 25, accessibility ≥ 90, best-practices ≥ 90, seo ≥ 90
  test('mobile audit meets thresholds', async ({ auditMobile }) => {
    await auditMobile(`${baseUrl}/partners/`);
  });

});
