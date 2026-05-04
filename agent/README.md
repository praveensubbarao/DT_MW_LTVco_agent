# testOrchestration Agent

AI-powered Playwright test generator. Describe a feature and the agent writes the spec, runs it, self-corrects on failures, and reports when all tests pass — no manual fixing required.

## How It Works (Agentic Loop)

```
Your feature description
       ↓
  Claude writes spec  ──→  write_file()
       ↓
  Claude runs tests   ──→  run_tests()
       ↓
  Tests fail?  ──→  Claude reads failures, rewrites spec  ──→  run_tests() again
       ↓
  All pass  ──→  Done ✓
```

The loop runs up to 10 iterations. If all tests pass in iteration 1, the whole process finishes in under a minute.

---

## Two Ways to Use It

### 1. Claude Code Skill (interactive chat)

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

Claude generates, writes, runs, and fixes the spec file directly in your workspace.

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

---

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

---

## Device Profiles

| Profile | Viewport | Device |
|---------|----------|--------|
| `desktop-chrome` | 1350×940 | Desktop |
| `tablet-chrome` | 1024×1366 | iPad Pro |
| `mobile-chrome` | 393×851 | Pixel 5 |
| `mobile-small` | 390×844 | iPhone 12 |

Default: all 4. Specify `Devices:` to limit.

---

## Output

```
Generating: homepage-banner
Devices:    desktop-chrome, tablet-chrome, mobile-chrome, mobile-small

  [1] write_file(path: "src/tests/homepage-banner/homepage-banner.spec.ts") → Written
  [1] run_tests(project: "desktop-chrome") → ✗ 2 failed
  [2] write_file(path: "src/tests/homepage-banner/homepage-banner.spec.ts") → Written
  [2] run_tests(project: "desktop-chrome") → ✓ 6 passed

────────────────────────────────────────────────────
 ✓ PASSED: src/tests/homepage-banner/homepage-banner.spec.ts
   Tests:      6
   Devices:    desktop-chrome, tablet-chrome, mobile-chrome, mobile-small
   Iterations: 2

  Run:
    1. npm test --project=desktop-chrome
    2. npm test
    3. npx playwright show-report
────────────────────────────────────────────────────
```

> Every generated spec includes a **Performance Audit** describe block with Lighthouse desktop + mobile tests automatically appended.

---

## Examples

### Simple page test

```
Feature: about-page
Description: About page loads and displays team section
Steps:
  1. Navigate to /about
  2. Verify page heading is visible
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
  4. Tap a nav link
  5. Verify URL changed
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

---

## Capabilities

| Can generate | Cannot generate (Phase 2+) |
|---|---|
| Navigation tests | Authentication / login |
| Click interactions | Test data setup |
| Form fills | API mocking |
| Text and URL assertions | Visual regression |
| Multi-device tests | |
| Role-based locators | |
| Lighthouse performance audits | |
| Self-correcting on test failures | |

---

## Troubleshooting

**Agent keeps failing after multiple iterations**
Check the test output in `test-results/`. Run headed to see what's on the page:
```bash
npm run test:headed --project=desktop-chrome
# Inspect element → copy selector → re-run with Selectors: { ... }
```

**Text assertion times out**
The element may be CSS-hidden (e.g. inside a collapsed mobile nav). The agent handles this automatically by switching to DOM-presence checks — if it doesn't, provide the selector explicitly.

**Wrong URL / 404**
Verify `Base URL:` matches the environment. Check `STACK` env var:
```bash
STACK=dev npm test
STACK=stg npm test
```

**Missing `// Steps:` validation error**
The precommit hook requires `// Steps:` above every `test()`. The agent always generates this — if missing, re-run generation.

---

## Files

```
agent/
├── README.md                          ← This file
├── testOrchestration.ts               ← CLI implementation (agentic loop)
├── .test-generation-instructions.md   ← System prompt: tools, workflow, conventions
└── mcp.json                           ← MCP server config

.claude/skills/
└── testOrchestration.md               ← Claude Code skill (/testOrchestration)
```
