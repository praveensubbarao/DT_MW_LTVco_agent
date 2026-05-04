You are setting up a production-grade Playwright + TypeScript E2E test framework.
Use the architecture, patterns, and conventions below exactly as described.

---

## Stack
- Playwright (latest stable), TypeScript 5.x, Node 20+
- Test runner: @playwright/test
- Reporters: HTML + JUnit XML
- Optional: Lighthouse (performance auditing), LLM-based self-healing
- Optional: Model Context Protocol (MCP) via mcp.json for Claude Code integration

---

## Project structure

src/
  actions/            ← one Actions class per page/feature area
  tests/              ← test specs, organized by feature subdirectory
  utils/
    fixtures/         ← baseTest.ts, featureFixture.ts, appBaseTest.ts
    lighthouse/       ← runLighthouse.ts, lighthouseThresholds.ts (optional)
    selfHeal/         ← selfHealingLocator.ts, llmProvider.ts, providers/ (optional)
    testdata/         ← test data files
scripts/              ← validate-spec-comments.js, new-prompt.js, etc.

---

## TypeScript config (tsconfig.json)

- target: ES2020, module: ESNext, moduleResolution: node
- strict: true, noEmit: true, esModuleInterop: true
- Path alias: "@/*" → "src/*"   (so imports read: @/utils/fixtures/appBaseTest)

---

## playwright.config.ts

- testDir: 'src/tests'
- timeout: 360_000 (6 min), expect.timeout: 10_000
- fullyParallel: true
- forbidOnly: !!process.env.CI
- failOnFlakyTests: !!process.env.CI
- retries: CI ? 2 : 0
- workers: process.env.WORKER_COUNT ? Number(process.env.WORKER_COUNT) : 2
- use.baseURL: driven by a STACK env var switch (dev/stg/prod)
- use.screenshot: 'on', trace: 'retain-on-failure-and-retries', video: 'on'
- use.actionTimeout: 60_000, navigationTimeout: 60_000
- projects: Multiple responsive device profiles:
    - desktop-chrome: 1350×940 (Desktop Chrome)
    - tablet-chrome: 1024×1366 (iPad Pro)
    - mobile-chrome: 393×851 (Pixel 5)
    - mobile-small: 390×844 (iPhone 12)
- reporters: ['list'], ['html'], ['junit']

Implement an envURL(stack) function that switches baseURL by env:
  STACK=dev → dev URL
  STACK=stg → staging URL
  STACK=prod → production URL (default)

---

## Responsive Design Testing

Tests run across four responsive device profiles automatically:

- **desktop-chrome**: 1350×940 — Full desktop experience
- **tablet-chrome**: 1024×1366 — iPad Pro tablet (landscape)
- **mobile-chrome**: 393×851 — Pixel 5 mobile phone
- **mobile-small**: 390×844 — iPhone 12 compact mobile

Use project-specific scripts to test single devices:
  npm run test:desktop    # Desktop only
  npm run test:tablet     # Tablet only
  npm run test:mobile     # Mobile (Pixel 5)
  npm run test:mobile-small # Small phone (iPhone 12)
  npm test                # All four projects (responsive full suite)

Each project inherits the same tests — Playwright automatically adapts viewport/device settings per project.
All projects run in parallel unless --workers=1 is specified.

---

## Fixture composition pattern

### src/utils/fixtures/baseTest.ts
Extend Playwright's base test with an `appActions` fixture:

  import { test as base, expect } from '@playwright/test';
  import { AppActions } from '@/actions/AppActions';

  type AppFixtures = { appActions: AppActions };

  export const test = base.extend<AppFixtures>({
    appActions: async ({ page }, use, testInfo) => {
      await use(new AppActions(page, testInfo));
    },
  });
  export { expect };

### src/utils/fixtures/appBaseTest.ts  (the single import point for all tests)
Merge all fixtures together:

  import { mergeTests } from '@playwright/test';
  import { test as base, expect } from '@/utils/fixtures/baseTest';
  import { lighthouseTest } from '@/utils/fixtures/lighthouseFixture';  // optional

  export const test = mergeTests(base, lighthouseTest);
  export { expect };

All tests import ONLY from '@/utils/fixtures/appBaseTest' — never from '@playwright/test' directly.

---

## Actions class pattern (src/actions/AppActions.ts)

- Constructor: (private readonly page: Page, private readonly testInfo?: TestInfo)
- Expose a getBaseURL() method: reads baseURL from page.context()._options.baseURL
- Implement a private clickLocator(locator) with 3-tier fallback:
    1. locator.click()
    2. locator.click({ force: true })
    3. elementHandle.evaluate(el => el.click())
- Page navigation methods: openPage(), expectPageIsVisible()
- Assertion helpers: expectPageUrlContains(fragment), expectPageBodyContains(text)
- Use getByRole, getByText, getByLabel for all locators — avoid brittle CSS
- If testInfo is available, wrap locators with selfHeal() for LLM-assisted healing

Never instantiate Actions classes in tests — always use the fixture.

---

## Test conventions

- Every test file uses test.describe() as the outer block
- Every test() block must have a step comment above it listing numbered steps:

  // Steps:
  // 1. Navigate to the page
  // 2. Assert the heading is visible
  // 3. ...
  test('Feature — does X correctly', async ({ appActions }) => { ... });

- Use expect.soft() when asserting multiple independent values (don't stop at first failure)
- Never use page.waitForTimeout() — use waitForLoadState() or expect(...).toBeVisible()
- Never hardcode environment URLs — use appActions.getBaseURL()

---

## Self-healing locator system (src/utils/selfHeal/)

Implement a Strategy pattern:

### llmProvider.ts
- LLMProvider interface with healSelector(description, domSnapshot): Promise<HealResult>
- HealResult: { selector: string, confidence: 'high'|'medium'|'low', reasoning: string }
- Shared buildHealPrompt(description, domSnapshot): string — used by ALL providers
- Shared parseHealResult(raw): HealResult — strips markdown fences, parses first JSON object
- createLLMProvider() factory — reads LLM_PROVIDER env var, returns matching provider or null

### providers/
- ollamaProvider.ts — calls /api/chat, reads OLLAMA_BASE_URL, OLLAMA_USER, OLLAMA_API_KEY, OLLAMA_MODEL
- openAIProvider.ts — calls OpenAI chat completions, reads OPENAI_API_KEY, OPENAI_MODEL
- claudeProvider.ts — calls Anthropic Messages API, reads ANTHROPIC_API_KEY, CLAUDE_MODEL

### selfHealingLocator.ts
- Export: selfHeal(page, testInfo, options): Promise<Locator>
- options: { description, primary, domSnapshotLimit?, timeout?, provider? }
- Flow:
    1. Try primary(page) locator with timeout
    2. On failure: snapshot body innerHTML (truncated to domSnapshotLimit chars, default 8000)
    3. Call provider.healSelector(description, domSnapshot)
    4. Validate healed selector is visible
    5. Annotate testInfo with 'self-heal' annotation
    6. Write entry to self-heal-report/heal-log.json
    7. Return healed locator
- Module-level provider singleton (resolved once via getDefaultProvider())
- If no provider configured — re-throw original error (graceful degradation)

LLM prompt instructs the model to:
- Return a single resilient CSS selector
- Prefer data-testid/aria-label/role attributes over structural selectors
- Avoid nth-child/positional selectors unless no alternative
- Respond ONLY with JSON: { selector, confidence, reasoning }

---

## Lighthouse integration (src/utils/lighthouse/)

### lighthouseThresholds.ts
- DESKTOP_THRESHOLDS: { performance: 50, accessibility: 90, bestPractices: 90, seo: 90 }
- MOBILE_THRESHOLDS: { performance: 25, accessibility: 90, bestPractices: 90, seo: 90 }
- thresholdMsg(label, formFactor, score, threshold): string — for assertion messages

### runLighthouse.ts
- runLighthouse(url, formFactor: 'desktop'|'mobile'): Promise<LighthouseResult>
- Launches a SEPARATE headless Chrome instance (chrome-launcher) — does not reuse Playwright browser
- Desktop: 1350×940, no mobile emulation
- Mobile: 412×915, deviceScaleFactor 2.625 (Pixel 5 equivalent)
- Returns: { scores: LighthouseScores, htmlReport: string, jsonReport: string }
- Scores are Math.round(lhr.categories[cat].score * 100)

### lighthouseFixture.ts
- Extend base test with lighthouse fixture providing audit(url) and auditMobile(url)
- Each method calls runLighthouse, attaches HTML report to testInfo, pushes score annotations
- Annotation format: type='lighthouse:desktop:performance', description='92 ✓ (threshold: 50)'

---

## Pre-commit enforcement

Add a script (scripts/validate-spec-comments.js) that:
- Finds all *.spec.ts files in src/tests/
- Checks that every test() block has a // Steps: comment immediately above it
- Exits with code 1 and prints offending files/lines if any test block lacks the comment
- Wire it as: "precommit": "node ./scripts/validate-spec-comments.js"

---

## Model Context Protocol (MCP) for Claude Code

### mcp.json
- Standard MCP configuration file for Claude Code
- Enables Playwright MCP server integration (`@modelcontextprotocol/server-playwright`)
- Allows Claude to run tests, generate test code, validate selectors, and analyze results

### Integration Steps
1. Copy `mcp.json` to Claude Code config directory or reference it in settings
2. Claude Code will automatically recognize and use Playwright MCP capabilities
3. You can then ask Claude to generate tests, run tests, and validate selectors

---

## Environment variables (.env)

STACK=prod                         # dev | stg | prod
WORKER_COUNT=2                     # parallel worker count
LLM_PROVIDER=ollama                # ollama | openai | claude

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_USER=
OLLAMA_API_KEY=
OLLAMA_MODEL=llama3

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o

# Anthropic
ANTHROPIC_API_KEY=
CLAUDE_MODEL=claude-sonnet-4-6

---

## package.json scripts

"test"                → npx playwright test
"test:headed"         → npx playwright test --headed
"test:desktop"        → npx playwright test --project=desktop-chrome
"test:tablet"         → npx playwright test --project=tablet-chrome
"test:mobile"         → npx playwright test --project=mobile-chrome
"test:mobile-small"   → npx playwright test --project=mobile-small
"test:responsive"     → npx playwright test (all responsive projects)
"test:retry-failed"   → npx playwright test --last-failed
"install:browsers"    → npx playwright install
"format"              → prettier --write .
"prompt:new"          → node ./scripts/new-prompt.js
"heal:suggest"        → node ./scripts/suggest-selector-fixes.js
"heal:apply"          → node ./scripts/suggest-selector-fixes.js --apply

---

## What NOT to do

- Never use page.waitForTimeout() — always use waitForLoadState or expect().toBeVisible()
- Never import the Actions class directly in tests — use the fixture
- Never hardcode environment URLs — use getBaseURL()
- Never use @playwright/test directly in tests — always use the merged appBaseTest
- Never add a test without step comments above it
