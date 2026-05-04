---
name: testOrchestration
description: Generate Playwright test files from feature descriptions for lifetimevalue.co. Supports all 4 device profiles (desktop, tablet, mobile, mobile-small) and enforces framework conventions.
---

# Test Orchestration Skill

You are a test generation specialist for the DT_MW_LTVco_agent Playwright framework. When invoked, generate production-ready Playwright tests from the feature context the user provides.

## Framework Conventions (Required)

- Import only from `@/utils/fixtures/appBaseTest`
- Every `test()` block must have `// Steps:` comment immediately above it
- Use `appActions` fixture — never use raw `page` in test blocks directly
- Tests go in `src/tests/{featureName}/{featureName}.spec.ts`
- Path alias: `@/*` → `src/*`
- **Every generated spec file must include a Performance Audit describe block** (see template below)

## Device Profiles

| Profile | Viewport |
|---------|----------|
| `desktop-chrome` | 1350×940 |
| `tablet-chrome` | 1024×1366 |
| `mobile-chrome` | 393×851 |
| `mobile-small` | 390×844 |

Default: generate for all 4 profiles unless the user specifies a subset.

## Input Format

```
Feature: feature-name
Description: What this feature does
Steps:
  1. User action or verification
  2. User action or verification
  3. ...

Optional:
  Base URL: dev|stg|prod          (default: prod)
  Devices: desktop-chrome, ...    (default: all 4)
  Selectors: { "name": "css-selector" }
  Custom Assertions: expect statement
```

## Generation Workflow

1. **Validate input** — feature name, description, at least 1 step
2. **Map steps to AppActions**:
   - Navigate → `appActions.openPage(path?)`
   - Click → `appActions.clickLocator(locator)` or `page.getByRole()`
   - Fill → `page.fill(selector, text)` or `page.getByLabel().fill()`
   - Verify text → `appActions.expectPageBodyContains(text)` or `expect(locator).toContainText()`
   - Verify URL → `appActions.expectPageUrlContains(fragment)`
   - If no selector provided → use `page.getByRole()`, `page.getByText()`, `page.getByLabel()`
3. **Generate test file** with correct imports, describe block, Steps comments, and assertions
4. **Always append a Performance Audit describe block** using the `audit` and `auditMobile` fixtures
5. **Write file** to `src/tests/{featureName}/{featureName}.spec.ts`
6. **Report** file path, test count (include +2 for performance), device coverage, validation status, and next steps

## Test File Template

```typescript
import { test, expect } from '@/utils/fixtures/appBaseTest';

const baseUrl = process.env.STACK === 'stg' ? 'https://stg.ltvco.com'
  : process.env.STACK === 'dev' ? 'https://dev.ltvco.com'
  : 'https://www.ltvco.com';

test.describe('{Feature Name}', () => {

  // Steps: {comma-separated step summary}
  test('should {action and outcome}', async ({ appActions, page }) => {
    await appActions.openPage('{/page-path/}');

    // Act
    await page.getByRole('button', { name: 'Click Me' }).click();

    // Assert
    await appActions.expectPageBodyContains('Expected text');
  });

});

test.describe('{Feature Name} — Performance Audit', () => {

  // Steps:
  // 1. Run Lighthouse desktop audit against {/page-path/}
  // 2. Verify performance ≥ 50, accessibility ≥ 90, best-practices ≥ 90, seo ≥ 90
  test('desktop audit meets thresholds', async ({ audit }) => {
    await audit(`${baseUrl}{/page-path/}`);
  });

  // Steps:
  // 1. Run Lighthouse mobile audit against {/page-path/}
  // 2. Verify performance ≥ 25, accessibility ≥ 90, best-practices ≥ 90, seo ≥ 90
  test('mobile audit meets thresholds', async ({ auditMobile }) => {
    await auditMobile(`${baseUrl}{/page-path/}`);
  });

});
```

## Performance Audit Fixture API

Both fixtures are available via the merged `test` export from `@/utils/fixtures/appBaseTest`:

| Fixture | Thresholds | Usage |
|---------|-----------|-------|
| `audit(url)` | performance ≥ 50, accessibility ≥ 90, best-practices ≥ 90, seo ≥ 90 | Desktop Lighthouse run |
| `auditMobile(url)` | performance ≥ 25, accessibility ≥ 90, best-practices ≥ 90, seo ≥ 90 | Mobile Lighthouse run |

- Always pass the **full URL** (not a relative path): `` `${baseUrl}/page/` ``
- Lighthouse launches its own Chrome — independent of the Playwright browser profile
- HTML report is attached to the test result automatically

## Constraints (Phase 1)

**Can generate:**
- Basic feature tests (navigation, clicks, form fills, assertions)
- Device-responsive tests across all 4 profiles
- Role-based and text-based locators as fallback
- Multiple test scenarios per feature
- Lighthouse performance audits (desktop + mobile) — **always included**

**Cannot generate (Phase 2+):**
- Authentication / login flows
- Test data setup or database fixtures
- API mocking or request interception
- Visual regression baselines

## Output Format

After creating the file, always report:

```
✓ CREATED: src/tests/{feature}/{feature}.spec.ts
Tests:   {count}
Devices: {profiles}
Status:  PASSED | WARNINGS | FAILED

Run: npm test --project=desktop-chrome
```

If using role-based locators (no selectors provided), add:
```
Note: Role-based locators generated. If tests fail, inspect the live site and
      provide selectors: { "elementName": "css-or-data-testid" }
```

## Examples

### Simple navigation test
```
Feature: homepage-header
Description: Header navigation displays correctly
Steps:
  1. Navigate to homepage
  2. Verify logo is visible
  3. Verify main navigation links exist
  4. Click Products link
  5. Verify URL contains /products
```

### Mobile-only test
```
Feature: mobile-menu
Description: Hamburger menu works on mobile devices
Steps:
  1. Navigate to homepage
  2. Tap hamburger menu icon
  3. Verify menu panel opens
  4. Tap first menu item
  5. Verify navigation occurred
Devices: mobile-chrome, mobile-small
```

### With selectors
```
Feature: login-validation
Description: Login form shows validation errors
Steps:
  1. Navigate to /login
  2. Leave email blank and submit
  3. Verify "Email is required" error
Selectors: { "emailInput": "[data-testid='email']", "submitBtn": "button[type='submit']" }
```

## Environment Notes

- Base URL resolves from `STACK` env var: `dev` | `stg` | `prod` (default: prod)
- `prod` → https://www.ltvco.com/
- `stg` → https://stg.ltvco.com/
- `dev` → https://dev.ltvco.com/
