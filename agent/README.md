# testOrchestration Agent

AI-powered Playwright test generator for lifetimevalue.co. Describe a feature and get a ready-to-run test file covering all 4 device profiles.

## Two Ways to Use It

### 1. Claude Code Skill (interactive)

Invoke the skill in Claude Code chat:

```
/testOrchestration

Feature: homepage-banner
Description: Hero banner displays correctly across all devices
Steps:
  1. Navigate to homepage
  2. Verify banner image is visible
  3. Verify headline text is displayed
  4. Verify CTA button is clickable
```

Claude generates and writes `src/tests/homepage-banner/homepage-banner.spec.ts` directly.

### 2. CLI (programmatic / CI)

```bash
echo "Feature: homepage-banner
Description: Hero banner displays correctly across all devices
Steps:
  1. Navigate to homepage
  2. Verify banner image is visible
  3. Verify CTA button is clickable" | npm run generate:test
```

Or pipe a file:

```bash
npm run generate:test < feature.txt
cat feature.json | npm run generate:test
```

## Input Format

```
Feature: feature-name          (kebab-case, becomes folder + filename)
Description: What it does

Steps:
  1. Action or verification
  2. Action or verification
  ...

Optional:
  Base URL: dev|stg|prod       (default: prod)
  Devices: desktop-chrome, mobile-chrome
  Selectors: { "btnSubmit": ".submit-btn", "emailInput": "[data-testid='email']" }
```

JSON input also accepted:

```json
{
  "featureName": "my-feature",
  "description": "What it does",
  "steps": ["Navigate to page", "Click button", "Verify result"],
  "baseUrl": "prod",
  "deviceProfiles": ["desktop-chrome", "mobile-chrome"],
  "selectors": { "btn": ".submit" }
}
```

## Device Profiles

| Profile | Viewport | Device |
|---------|----------|--------|
| `desktop-chrome` | 1350×940 | Desktop |
| `tablet-chrome` | 1024×1366 | iPad Pro |
| `mobile-chrome` | 393×851 | Pixel 5 |
| `mobile-small` | 390×844 | iPhone 12 |

Default: all 4. Specify `Devices:` to limit.

## Output

```
✓ PASSED: src/tests/homepage-banner/homepage-banner.spec.ts
   Tests:   4
   Devices: desktop-chrome, tablet-chrome, mobile-chrome, mobile-small

  Run:
    1. npm test --project=desktop-chrome
    2. npm test
    3. npx playwright show-report
```

## Examples

### Simple page test

```
Feature: about-page
Description: About page loads and displays team section
Steps:
  1. Navigate to /about
  2. Verify page heading "About Us" is visible
  3. Verify team section exists
  4. Verify at least one team member name is shown
```

### Mobile-only test

```
Feature: mobile-nav
Description: Hamburger menu opens and navigates correctly
Steps:
  1. Navigate to homepage
  2. Tap hamburger menu icon
  3. Verify nav menu slides open
  4. Tap "Features" link
  5. Verify URL contains /features
Devices: mobile-chrome, mobile-small
```

### With CSS selectors

```
Feature: contact-form
Description: Contact form validates required fields
Steps:
  1. Navigate to /contact
  2. Submit form without filling fields
  3. Verify "Name is required" error appears
  4. Verify "Email is required" error appears
Selectors: { "nameInput": "[data-testid='contact-name']", "submitBtn": "button[type='submit']" }
```

### Dev environment

```
Feature: dev-dashboard
Description: Dashboard loads on dev
Steps:
  1. Navigate to /dashboard
  2. Verify dashboard title is visible
Base URL: dev
Devices: desktop-chrome
```

## Workflow: Generate → Run → Fix

```
1. Generate   →  npm run generate:test < feature.txt
2. Run        →  npm test --project=desktop-chrome
3. If failing →  npm run test:headed --project=desktop-chrome
4. Inspect    →  Right-click element → Inspect → Copy selector
5. Fix        →  Re-run generate with Selectors: { ... }
6. Commit     →  npm run precommit && git commit
```

## Phase 1 Capabilities

| Can generate | Cannot generate (Phase 2+) |
|---|---|
| Navigation tests | Authentication / login |
| Click interactions | Test data setup |
| Form fills | API mocking |
| Text assertions | Visual regression |
| URL assertions | Performance audits |
| Multi-device tests | |
| Role-based locators | |

## Troubleshooting

**Test fails: element not found**
Run headed to see what's on the page, then add selectors:
```bash
npm run test:headed --project=desktop-chrome
# Inspect element → copy selector → add to Selectors: { }
```

**Test fails: text not found**
Check exact casing and whitespace. Provide the exact string in your step description.

**Wrong URL / 404**
Verify `Base URL:` matches the right environment. Check `STACK` env var:
```bash
STACK=dev npm test
STACK=stg npm test
```

**Missing `// Steps:` validation error**
The precommit hook requires `// Steps:` above every `test()`. The agent always generates this — if missing, re-run generation.

## Files

```
agent/
├── README.md                          ← This file
├── testOrchestration.ts               ← CLI implementation (npm run generate:test)
├── .test-generation-instructions.md   ← System prompt used by the agent
└── mcp.json                           ← MCP server config (Playwright active)

.claude/skills/
└── testOrchestration.md               ← Claude Code skill (/testOrchestration)
```
