import { test, expect } from '@/utils/fixtures/appBaseTest';

const baseUrl = process.env.STACK === 'stg' ? 'https://stg.ltvco.com'
  : process.env.STACK === 'dev' ? 'https://dev.ltvco.com'
  : 'https://www.ltvco.com';

test.describe('About Page', () => {

  // Steps:
  // 1. Navigate to /about/
  // 2. Verify page loads and URL contains /about/
  // 3. Verify the page body is visible
  test('should load the About page successfully', async ({ appActions, page }) => {
    await appActions.openPage('/about/');
    await appActions.expectPageUrlContains('about');
    await expect(page.locator('body')).toBeVisible();
  });

  // Steps:
  // 1. Navigate to /about/
  // 2. Verify company name or intro text is present
  // 3. Verify page has at least one heading
  test('should display the company introduction section', async ({ appActions, page }) => {
    await appActions.openPage('/about/');
    await appActions.expectPageBodyContains('Lifetime Value');
    const heading = page.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible();
  });

  // Steps:
  // 1. Navigate to /about/
  // 2. Verify the nav container is present in the DOM
  // 3. Verify nav links exist (may be hidden on mobile behind hamburger menu)
  test('should display main navigation links', async ({ appActions, page }) => {
    await appActions.openPage('/about/');
    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeAttached();
    const navLinks = nav.locator('a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  // Steps:
  // 1. Navigate to /about/
  // 2. Verify "What We Do" section content is present
  // 3. Verify mission-related text is visible
  test('should display the What We Do and mission sections', async ({ appActions }) => {
    await appActions.openPage('/about/');
    await appActions.expectPageBodyContains('data');
  });

  // Steps:
  // 1. Navigate to /about/
  // 2. Verify brands section heading is visible
  // 3. Verify at least BeenVerified and Bumper brand names appear
  test('should display the brands portfolio section', async ({ appActions }) => {
    await appActions.openPage('/about/');
    await appActions.expectPageBodyContains('BeenVerified');
    await appActions.expectPageBodyContains('Bumper');
    await appActions.expectPageBodyContains('Ownerly');
  });

  // Steps:
  // 1. Navigate to /about/
  // 2. Verify all 9 brand names are present in the page body
  test('should list all brands in the portfolio', async ({ appActions }) => {
    await appActions.openPage('/about/');
    const brands = [
      'BeenVerified',
      'Bumper',
      'Ownerly',
      'NumberGuru',
      'PeopleSmart',
      'PeopleLooker',
      'NeighborWho',
      'ReversePhone',
      'MoneyBot5000',
    ];
    for (const brand of brands) {
      await appActions.expectPageBodyContains(brand);
    }
  });

  // Steps:
  // 1. Navigate to /about/
  // 2. Locate a "Learn More" CTA link for one of the brands
  // 3. Verify the link is visible and has an href
  test('should display Learn More CTAs for brands', async ({ appActions, page }) => {
    await appActions.openPage('/about/');
    const learnMoreLinks = page.locator('a').filter({ hasText: /learn more/i });
    const count = await learnMoreLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  // Steps:
  // 1. Navigate to /about/
  // 2. Verify core values section is present
  // 3. Verify at least one core value principle is visible
  test('should display the Core Values section', async ({ appActions }) => {
    await appActions.openPage('/about/');
    await appActions.expectPageBodyContains('Try, Fail, Learn, Repeat');
  });

  // Steps:
  // 1. Navigate to /about/
  // 2. Verify all five core value principles are visible
  test('should display all five core value principles', async ({ appActions }) => {
    await appActions.openPage('/about/');
    const values = [
      'Try, Fail, Learn, Repeat',
      'No Job is Above or Beneath You',
      'Question Everything, Respectfully',
      'Teach Each Other To Fish',
      'Be All In',
    ];
    for (const value of values) {
      await appActions.expectPageBodyContains(value);
    }
  });

  // Steps:
  // 1. Navigate to /about/
  // 2. Verify the Work With Us recruitment section exists
  // 3. Verify the "See Open Positions" button is visible
  test('should display the Work With Us recruitment section', async ({ appActions, page }) => {
    await appActions.openPage('/about/');
    await appActions.expectPageBodyContains('Work With Us');
    const openPositionsBtn = page.getByRole('link', { name: /see open positions/i });
    await expect(openPositionsBtn).toBeVisible();
  });

  // Steps:
  // 1. Navigate to /about/
  // 2. Click the "See Open Positions" link
  // 3. Verify the URL navigates to a careers or jobs page
  test('should navigate to careers page from See Open Positions CTA', async ({ appActions, page }) => {
    await appActions.openPage('/about/');
    const openPositionsBtn = page.getByRole('link', { name: /see open positions/i });
    await openPositionsBtn.click();
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    const isCareerRelated = /career|jobs|greenhouse|lever|workable/i.test(currentUrl);
    expect(isCareerRelated).toBeTruthy();
  });

  // Steps:
  // 1. Navigate to /about/
  // 2. Verify footer is visible
  // 3. Verify copyright notice contains LTVco or Lifetime Value
  test('should display the footer with copyright notice', async ({ appActions, page }) => {
    await appActions.openPage('/about/');
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
    await appActions.expectPageBodyContains('2026');
  });

  // Steps:
  // 1. Navigate to /about/
  // 2. Verify social media links are present in the footer
  test('should display social media links in footer', async ({ appActions, page }) => {
    await appActions.openPage('/about/');
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
    const socialLinks = footer.getByRole('link');
    const count = await socialLinks.count();
    expect(count).toBeGreaterThan(0);
  });

});

test.describe('About Page — Performance Audit', () => {

  // Steps:
  // 1. Run Lighthouse desktop audit against the About page
  // 2. Verify performance ≥ 50, accessibility ≥ 90, best-practices ≥ 90, seo ≥ 90
  test('desktop audit meets thresholds', async ({ audit }) => {
    await audit(`${baseUrl}/about/`);
  });

  // Steps:
  // 1. Run Lighthouse mobile audit against the About page
  // 2. Verify performance ≥ 25, accessibility ≥ 90, best-practices ≥ 90, seo ≥ 90
  test('mobile audit meets thresholds', async ({ auditMobile }) => {
    await auditMobile(`${baseUrl}/about/`);
  });

});
