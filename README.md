# DT_MW_LTVco_agent - E2E Test Framework

Production-grade Playwright + TypeScript E2E testing framework for Lifetime Value Co (ltvco.com) with self-healing locators, responsive design testing, and Lighthouse performance auditing.

## Features

- **Playwright + TypeScript**: Industry-standard E2E testing with full type safety
- **Responsive Design Testing**: Automatic testing across 4 device profiles (desktop, tablet, mobile)
- **Self-Healing Locators**: LLM-powered automatic selector repair (Ollama, OpenAI, Claude)
- **Lighthouse Integration**: Performance and accessibility auditing with configurable thresholds
- **Fixture Composition**: Type-safe fixture system with `appActions` and optional `audit` fixtures
- **Pre-commit Validation**: Automatic enforcement of step comment requirements
- **Multiple Reporters**: HTML, JUnit XML for CI/CD integration
- **Environment Switching**: Easy dev/staging/production URL configuration
- **Claude Code Integration**: MCP configuration for AI-assisted test management

## Test Environments

- **Development**: https://dev.ltvco.com
- **Staging**: https://stg.ltvco.com
- **Production**: https://www.ltvco.com (default)

## Responsive Design Testing

Tests run automatically across **four device profiles**:

| Device | Resolution | Use Case |
|--------|-----------|----------|
| Desktop Chrome | 1350×940 | Full desktop experience |
| iPad Pro | 1024×1366 | Tablet landscape |
| Pixel 5 | 393×851 | Standard mobile phone |
| iPhone 12 | 390×844 | Compact mobile device |

All tests execute on each device profile in parallel. Run specific device tests with:

```bash
npm run test:desktop        # Desktop only
npm run test:tablet         # Tablet only
npm run test:mobile         # Mobile (Pixel 5)
npm run test:mobile-small   # Small phone (iPhone 12)
npm test                    # All devices (default)
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
npx playwright install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your environment URLs and LLM provider settings
```

### 3. Run Tests
```bash
npm test                          # All tests, all devices
npm test -- press                 # Press page tests only
npm test --project=desktop-chrome # Desktop only
npm test --project=desktop-chrome -- press   # Press page, desktop only
npm run test:headed              # All tests with visible browser
npm run test:retry-failed        # Retry last failures
```

## Project Structure

```
src/
├── actions/
│   └── AppActions.ts                    # Page interaction class (openPage, expectPageBodyContains, etc.)
├── tests/
│   ├── about/
│   │   └── about.spec.ts                # Generated: About page tests + Lighthouse audit
│   ├── homepage/
│   │   └── homepage.spec.ts             # Generated: Homepage tests
│   └── partners/
│       └── partners.spec.ts             # Generated: Partners page tests + Lighthouse audit
└── utils/
    ├── fixtures/
    │   ├── appBaseTest.ts               # Main import for all tests (merges appActions + lighthouse)
    │   ├── baseTest.ts                  # appActions fixture definition
    │   └── lighthouseFixture.ts         # audit() and auditMobile() fixture definitions
    ├── lighthouse/
    │   ├── lighthouseThresholds.ts      # Per-device pass/fail thresholds
    │   └── runLighthouse.ts             # Chrome launcher + Lighthouse runner
    └── selfHeal/                        # LLM-powered self-healing locators

agent/
├── README.md                            # Agent usage guide
├── testOrchestration.ts                 # CLI: agentic loop (write → run → fix → repeat)
├── .test-generation-instructions.md    # System prompt: tools, workflow, conventions
└── mcp.json                             # MCP server config (Playwright)

.claude/
└── skills/
    └── testOrchestration.md             # Claude Code skill (/testOrchestration chat command)

scripts/
└── validate-spec-comments.js            # Pre-commit hook: enforces // Steps: on every test()
```

## Configuration

### playwright.config.ts
- Configurable baseURL via `STACK` environment variable (dev/stg/prod)
- Parallel test execution with worker configuration
- Screenshot and video on failure
- HTML and JUnit XML reporters
- 4 responsive device projects

### Environment Variables
See `.env.example` for all available options:
- `STACK`: Target environment (dev, stg, prod)
- `WORKER_COUNT`: Number of parallel workers
- `LLM_PROVIDER`: Self-healing provider (ollama, openai, claude)

### Available Scripts
```bash
npm test                    # Run all tests
npm run test:headed        # Run with visible browser
npm run test:desktop       # Desktop-only tests
npm run test:tablet        # Tablet-only tests
npm run test:mobile        # Mobile-only tests
npm run test:mobile-small  # Small phone-only tests
npm run test:responsive    # All responsive profiles
npm run test:retry-failed  # Retry failed tests
npm run install:browsers   # Install Playwright browsers
npm run format            # Format code with Prettier
npm run precommit         # Validate spec comments
```

### Running Tests for a Specific Feature

Pass the folder name (or any path fragment) after `--` to scope the run:

```bash
# Single feature, all devices
npm test -- press

# Single feature, one device
npm test --project=desktop-chrome -- press

# Single feature, headed (useful for debugging)
npm run test:headed -- press

# Multiple features
npm test -- press about

# Against a specific environment
STACK=stg npm test -- press
```

The argument is matched against the test file path — `press` matches `src/tests/press/press.spec.ts`.

To run only the Lighthouse audits for a feature:

```bash
npm test --project=desktop-chrome -- --grep "Performance Audit" press
```

## AI Test Generation

Tests are generated by an agentic loop that writes the spec, runs it, and self-corrects until passing.

### Via Claude Code skill (interactive)

```
/testOrchestration

Feature: contact-page
Description: Contact form submits successfully
Steps:
  1. Navigate to /contact
  2. Fill in name and email
  3. Submit the form
  4. Verify confirmation message appears
```

Claude writes `src/tests/contact-page/contact-page.spec.ts`, runs it, and fixes any failures automatically.

### Via CLI (programmatic / CI)

```bash
echo "Feature: contact-page
Description: Contact form submits successfully
Steps:
  1. Navigate to /contact
  2. Fill in name and email
  3. Submit the form
  4. Verify confirmation message appears" | npm run generate:test
```

See [agent/README.md](agent/README.md) for the full input format, examples, and troubleshooting.

### MCP Integration

`agent/mcp.json` configures the Playwright MCP server for Claude Code, enabling Claude to run and inspect tests directly from chat.

## Available Commands

```bash
```

## Test Writing Guidelines

Every test must include a `// Steps:` comment:

```typescript
// Steps:
// 1. Navigate to login page
// 2. Enter credentials
// 3. Verify dashboard loads
test('Auth — should login successfully', async ({ appActions }) => {
  await appActions.openPage('/login');
  // ... test implementation
});
```

The precommit hook validates this automatically.

### AppActions Fixture API

```typescript
// Navigate to a page
await appActions.openPage('/path');

// Get configured base URL
const baseURL = appActions.getBaseURL();

// Wait for page to be visible
await appActions.expectPageIsVisible();

// Assert URL contains fragment
await appActions.expectPageUrlContains('fragment');

// Assert page body contains text
await appActions.expectPageBodyContains('text');
```

## Self-Healing Locators

Enable automatic selector repair with LLM providers:

```typescript
// Configure provider in .env
// LLM_PROVIDER=ollama
// OLLAMA_BASE_URL=http://localhost:11434
// OLLAMA_MODEL=llama3

const healed = await selfHeal(page, testInfo, {
  description: 'login button',
  primary: (page) => page.getByRole('button', { name: /login/i }),
});
```

Supported providers:
- **Ollama**: Local open-source LLM
- **OpenAI**: GPT-4o or other OpenAI models
- **Claude**: Anthropic Claude models

## Lighthouse Performance Auditing

```typescript
test('Performance — desktop audit', async ({ audit }) => {
  await audit('https://www.ltvco.com');
});

test('Performance — mobile audit', async ({ auditMobile }) => {
  await auditMobile('https://www.ltvco.com');
});
```

Configurable thresholds per device type in `src/utils/lighthouse/lighthouseThresholds.ts`:
- **Desktop**: performance: 50, accessibility: 85, best-practices: 90, seo: 85
- **Mobile**: performance: 25, accessibility: 85, best-practices: 90, seo: 85

## CI/CD Integration

Set environment variables in your CI pipeline:

```bash
STACK=prod WORKER_COUNT=4 npm test
```

Test results are available in:
- `test-results/junit.xml` — JUnit XML for CI systems
- `playwright-report/index.html` — HTML report
- `self-heal-report/heal-log.json` — Self-healing attempts log

## Development

### Format Code
```bash
npm run format
```

### Validate Spec Comments
```bash
npm run precommit
```

### Add New Test Suite
```typescript
// src/tests/features/my-feature.spec.ts
import { test, expect } from '@/utils/fixtures/appBaseTest';

test.describe('My Feature', () => {
  // Steps:
  // 1. Description of step 1
  // 2. Description of step 2
  test('Feature — description', async ({ appActions, page }) => {
    // test code
  });
});
```

## Troubleshooting

### Tests timing out
- Increase timeout in `playwright.config.ts` (default: 6 min)
- Check `actionTimeout` and `navigationTimeout` settings
- Use `await page.waitForLoadState('networkidle')` after navigation

### Selectors breaking
- Enable self-healing by configuring `LLM_PROVIDER`
- Check `self-heal-report/heal-log.json` for healing attempts
- Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors

### Lighthouse audits failing
- Verify the URL is accessible
- Check threshold values in `lighthouseThresholds.ts`
- Review Lighthouse HTML report for specific issues

## License

This project is licensed under the MIT License. See the LICENSE file for details.

```
MIT License

Copyright (c) 2026 Lifetime Value Co

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
