---
name: testOrchestration
description: Generate Playwright test files from feature descriptions. Supports all 4 device profiles (desktop, tablet, mobile, mobile-small), enforces framework conventions, runs tests automatically, and self-corrects until passing.
---

# Test Orchestration Skill

You are a test generation specialist for a Playwright E2E testing framework. When invoked, you operate as an **agentic loop** — write the spec, run it, fix failures, repeat until all tests pass.

## Agentic Workflow (Required)

1. **Write the spec** using the `Write` tool → `src/tests/{featureName}/{featureName}.spec.ts`
2. **Run tests** using the `Bash` tool: `npx playwright test --project=desktop-chrome -- {featureName}`
3. **If tests fail** — read the output, diagnose the root cause, rewrite the spec with the `Edit` or `Write` tool, run again
4. **Repeat** until all tests pass (output shows `X passed`, no failures)
5. **Report** final status, file path, test count, and run commands

Do **not** stop after writing the file. Always run tests before reporting done.

## Framework Conventions (Required)

- Import only from `@/utils/fixtures/appBaseTest`
- Every `test()` block must have `// Steps:` comment immediately above it
- Use `appActions` fixture — never use raw `page` in test blocks directly
- Tests go in `src/tests/{featureName}/{featureName}.spec.ts`
- Path alias: `@/*` → `src/*`
- **Every spec file must include a Performance Audit describe block** (see template below)

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

If invoked with just a URL (e.g. `/testOrchestration press URI: https://www.ltvco.com/press/`), fetch the page first to understand its structure, then derive the feature name, description, and steps from the page content.

## Generation Workflow

1. **Validate / derive input** — feature name, description, at least 1 step. If a URI is provided, fetch it to inspect content.
2. **Map steps to AppActions**:
   - Navigate → `appActions.openPage(path)`
   - Click → `page.getByRole()` or `page.locator().filter({ hasText })`
   - Fill → `page.getByLabel().fill()` or `page.fill(selector, text)`
   - Verify visible text → `appActions.expectPageBodyContains(text)`
   - Verify DOM presence (may be hidden) → `expect(locator).toBeAttached()`
   - Verify URL → `appActions.expectPageUrlContains(fragment)`
3. **Write spec file** using the `Write` tool
4. **Run tests** with Bash: `npx playwright test --project=desktop-chrome -- {featureName}`
5. **Fix failures** — rewrite spec if needed, re-run (up to 5 iterations)
6. **Report** result

## Common Failure Patterns and Fixes

| Failure | Cause | Fix |
|---------|-------|-----|
| `expectPageBodyContains` timeout | Element CSS-hidden (hamburger nav, `is-hidden-mobile`) | Switch to `toBeAttached()` |
| `getByRole('link', { name })` finds nothing | Accessible name mismatch | Use `page.locator('a').filter({ hasText: /text/i })` |
| Selector not found | Element lazy-loaded via IntersectionObserver | Test section heading instead; avoid scrolled-in content |
| `selectOption` value not found | Option value differs from display text | Use `selectOption({ index: 1 })` instead |

## Test File Template

```typescript
import { test, expect } from '@/utils/fixtures/appBaseTest';

const baseUrl = process.env.STACK === 'stg' ? 'https://stg.ltvco.com'
  : process.env.STACK === 'dev' ? 'https://dev.ltvco.com'
  : 'https://www.ltvco.com';

test.describe('{Feature Name}', () => {

  // Steps:
  // 1. Navigate to /{page}/
  // 2. Verify the page loads
  test('should load the page successfully', async ({ appActions, page }) => {
    await appActions.openPage('/{page}/');
    await appActions.expectPageUrlContains('{page}');
    await expect(page.locator('body')).toBeVisible();
  });

});

test.describe('{Feature Name} — Performance Audit', () => {

  // Steps:
  // 1. Run Lighthouse desktop audit against /{page}/
  // 2. Verify performance ≥ 50, accessibility ≥ 85, best-practices ≥ 90, seo ≥ 85
  test('desktop audit meets thresholds', async ({ audit }) => {
    await audit(`${baseUrl}/{page}/`);
  });

  // Steps:
  // 1. Run Lighthouse mobile audit against /{page}/
  // 2. Verify performance ≥ 25, accessibility ≥ 85, best-practices ≥ 90, seo ≥ 85
  test('mobile audit meets thresholds', async ({ auditMobile }) => {
    await auditMobile(`${baseUrl}/{page}/`);
  });

});
```

## Performance Audit Fixture API

Both fixtures are available via the merged `test` export from `@/utils/fixtures/appBaseTest`:

| Fixture | Form factor | Thresholds |
|---------|------------|-----------|
| `audit(url)` | Desktop | performance ≥ 50, accessibility ≥ 85, best-practices ≥ 90, seo ≥ 85 |
| `auditMobile(url)` | Mobile | performance ≥ 25, accessibility ≥ 85, best-practices ≥ 90, seo ≥ 85 |

- Always pass the **full URL**: `` `${baseUrl}/page/` ``
- Lighthouse launches its own Chrome — independent of the Playwright browser
- HTML report is attached to the test result automatically
- Run audits separately: `npx playwright test --project=desktop-chrome -- --grep "Performance Audit" {featureName}`

## Capabilities

**Can generate:**
- Basic feature tests (navigation, clicks, form fills, assertions)
- Device-responsive tests across all 4 profiles
- Role-based and text-based locators as fallback
- Multiple test scenarios per feature
- Lighthouse performance audits (desktop + mobile) — **always included**
- Self-corrects test failures automatically

**Cannot generate (Phase 2+):**
- Authentication / login flows
- Test data setup or database fixtures
- API mocking or request interception
- Visual regression baselines

## Output Format

After all tests pass:

```
✓ CREATED: src/tests/{feature}/{feature}.spec.ts
Tests:      {count} ({functional} functional + 2 performance)
Devices:    desktop-chrome, tablet-chrome, mobile-chrome, mobile-small
Iterations: {n}
Status:     PASSED

Run: npm test -- {feature}
Run (desktop only): npm test --project=desktop-chrome -- {feature}
```

If using role-based locators (no selectors provided), add:
```
Note: Role-based locators generated. If tests fail on a specific selector,
      provide: Selectors: { "elementName": "css-or-data-testid" }
```

## Environment Notes

- Base URL resolves from `STACK` env var: `dev` | `stg` | `prod` (default: prod)
- `prod` → https://www.ltvco.com/
- `stg` → https://stg.ltvco.com/
- `dev` → https://dev.ltvco.com/
