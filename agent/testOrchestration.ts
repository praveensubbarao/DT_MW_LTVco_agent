#!/usr/bin/env tsx
/**
 * testOrchestration — AI-powered Playwright test generator
 *
 * Usage:
 *   echo "<feature context>" | npm run generate:test
 *   npm run generate:test < feature.txt
 *   cat feature.json | npm run generate:test
 *
 * Reads feature context from stdin (plain text or JSON), calls Claude to
 * generate a Playwright test file, writes it to src/tests/{featureName}/,
 * validates the output, and reports the result.
 */
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeatureContext {
  featureName: string;
  description: string;
  steps: string[];
  baseUrl?: 'dev' | 'stg' | 'prod';
  selectors?: Record<string, string>;
  deviceProfiles?: string[];
  customAssertions?: string[];
}

interface GenerationResult {
  filePath: string;
  testCount: number;
  deviceCoverage: string[];
  validationStatus: 'PASSED' | 'WARNINGS' | 'FAILED';
  nextSteps: string[];
  warnings: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_DEVICES = ['desktop-chrome', 'tablet-chrome', 'mobile-chrome', 'mobile-small'];
const VALID_DEVICES = new Set(DEFAULT_DEVICES);
const VALID_STACKS = new Set<string>(['dev', 'stg', 'prod']);

// ─── System prompt ────────────────────────────────────────────────────────────

function loadSystemPrompt(): string {
  const promptPath = join(__dirname, '.test-generation-instructions.md');
  try {
    return readFileSync(promptPath, 'utf-8');
  } catch {
    throw new Error('System prompt not found at agent/.test-generation-instructions.md');
  }
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatFeatureContext(ctx: FeatureContext): string {
  const parts: string[] = [
    `Feature: ${ctx.featureName}`,
    `Description: ${ctx.description}`,
    'Steps:',
    ...ctx.steps.map((s, i) => `  ${i + 1}. ${s}`),
  ];

  if (ctx.baseUrl) parts.push(`\nBase URL: ${ctx.baseUrl}`);

  if (ctx.selectors && Object.keys(ctx.selectors).length > 0) {
    parts.push(`\nSelectors: ${JSON.stringify(ctx.selectors, null, 2)}`);
  }

  if (ctx.deviceProfiles?.length) {
    parts.push(`\nDevices: ${ctx.deviceProfiles.join(', ')}`);
  }

  if (ctx.customAssertions?.length) {
    parts.push(`\nCustom Assertions:\n${ctx.customAssertions.map((a) => `  - ${a}`).join('\n')}`);
  }

  return parts.join('\n');
}

// ─── Code extraction & validation ─────────────────────────────────────────────

function extractTypeScriptCode(text: string): string {
  const match = text.match(/```typescript\n([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

function countTests(code: string): number {
  return (code.match(/\btest\(/g) ?? []).length;
}

function validateTestCode(code: string): { status: 'PASSED' | 'WARNINGS' | 'FAILED'; warnings: string[] } {
  const warnings: string[] = [];
  const testCount = countTests(code);

  if (testCount === 0) {
    return { status: 'FAILED', warnings: ['No test() blocks found in generated code'] };
  }

  // Verify // Steps: appears before each test()
  const stepsBeforeTest = (code.match(/\/\/ Steps:[\s\S]*?\n\s*test\(/g) ?? []).length;
  if (stepsBeforeTest < testCount) {
    warnings.push(
      `${testCount - stepsBeforeTest} test(s) missing // Steps: comment (required by precommit hook)`
    );
  }

  if (!code.includes("from '@/utils/fixtures/appBaseTest'")) {
    warnings.push("Import from '@/utils/fixtures/appBaseTest' not found — verify import path");
  }

  return { status: warnings.length > 0 ? 'WARNINGS' : 'PASSED', warnings };
}

// ─── Input parsing ────────────────────────────────────────────────────────────

function parseFeatureText(text: string): FeatureContext {
  const ctx: Partial<FeatureContext> & { steps: string[] } = { steps: [] };
  let mode: 'steps' | 'selectors' | null = null;
  let selectorBuffer = '';

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('Feature:')) {
      ctx.featureName = line.replace('Feature:', '').trim().toLowerCase().replace(/\s+/g, '-');
      mode = null;
    } else if (line.startsWith('Description:')) {
      ctx.description = line.replace('Description:', '').trim();
      mode = null;
    } else if (line === 'Steps:') {
      mode = 'steps';
    } else if (line.startsWith('Selectors:')) {
      mode = 'selectors';
      selectorBuffer = line.replace('Selectors:', '').trim();
    } else if (/^Base\s*URL:/i.test(line)) {
      const val = line.split(':').slice(1).join(':').trim();
      if (VALID_STACKS.has(val)) ctx.baseUrl = val as 'dev' | 'stg' | 'prod';
      mode = null;
    } else if (line.startsWith('Devices:')) {
      ctx.deviceProfiles = line
        .replace('Devices:', '')
        .split(',')
        .map((d) => d.trim())
        .filter((d) => VALID_DEVICES.has(d));
      mode = null;
    } else if (mode === 'steps' && /^\d+\./.test(line)) {
      ctx.steps.push(line.replace(/^\d+\.\s*/, ''));
    } else if (mode === 'selectors') {
      selectorBuffer += ' ' + line;
    }
  }

  if (selectorBuffer) {
    try {
      ctx.selectors = JSON.parse(selectorBuffer.replace(/'/g, '"')) as Record<string, string>;
    } catch {
      // Selectors are optional — ignore parse failures
    }
  }

  return ctx as FeatureContext;
}

// ─── Core generation ──────────────────────────────────────────────────────────

async function generateTest(context: FeatureContext): Promise<GenerationResult> {
  const client = new Anthropic();
  const systemPrompt = loadSystemPrompt();
  const deviceCoverage = context.deviceProfiles?.length ? context.deviceProfiles : DEFAULT_DEVICES;

  console.log(`\nGenerating: ${context.featureName}`);
  console.log(`Devices:    ${deviceCoverage.join(', ')}\n`);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: formatFeatureContext(context) }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude API');

  const testCode = extractTypeScriptCode(content.text);
  const { status: validationStatus, warnings } = validateTestCode(testCode);

  const featureDir = join(PROJECT_ROOT, 'src', 'tests', context.featureName);
  const relPath = `src/tests/${context.featureName}/${context.featureName}.spec.ts`;

  mkdirSync(featureDir, { recursive: true });
  writeFileSync(join(featureDir, `${context.featureName}.spec.ts`), testCode, 'utf-8');

  return {
    filePath: relPath,
    testCount: countTests(testCode),
    deviceCoverage,
    validationStatus,
    nextSteps: [
      `npm test --project=desktop-chrome`,
      `npm test`,
      `npx playwright show-report`,
    ],
    warnings,
  };
}

// ─── Output ───────────────────────────────────────────────────────────────────

function printResult(result: GenerationResult): void {
  const icon = { PASSED: '✓', WARNINGS: '⚠', FAILED: '✗' }[result.validationStatus];
  const line = '─'.repeat(56);

  console.log(`\n${line}`);
  console.log(` ${icon} ${result.validationStatus}: ${result.filePath}`);
  console.log(`   Tests:   ${result.testCount}`);
  console.log(`   Devices: ${result.deviceCoverage.join(', ')}`);

  if (result.warnings.length > 0) {
    console.log('\n  Warnings:');
    result.warnings.forEach((w) => console.log(`    - ${w}`));
  }

  console.log('\n  Run:');
  result.nextSteps.forEach((s, i) => console.log(`    ${i + 1}. ${s}`));
  console.log(`${line}\n`);
}

// ─── Stdin ────────────────────────────────────────────────────────────────────

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk: string) => (data += chunk));
    process.stdin.on('end', () => resolve(data.trim()));
  });
}

// ─── Help ─────────────────────────────────────────────────────────────────────

const HELP = `
testOrchestration — AI-powered Playwright test generator

Usage:
  echo "<feature context>" | npm run generate:test
  npm run generate:test < feature.txt
  cat feature.json | npm run generate:test

Feature Context Format (plain text):
  Feature: feature-name
  Description: What the feature does
  Steps:
    1. Navigate to page
    2. Click button
    3. Verify result

  Optional:
    Base URL: dev|stg|prod              (default: prod)
    Devices: desktop-chrome, mobile-chrome
    Selectors: { "btnSubmit": ".submit-btn" }

Feature Context Format (JSON):
  {
    "featureName": "my-feature",
    "description": "What it does",
    "steps": ["Navigate to page", "Click button", "Verify result"],
    "baseUrl": "prod",
    "deviceProfiles": ["desktop-chrome"],
    "selectors": { "btn": ".submit" }
  }

Environment:
  ANTHROPIC_API_KEY    Required — get from https://console.anthropic.com/

Output:
  src/tests/{featureName}/{featureName}.spec.ts
`;

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }

  const stdinData = await readStdin();
  const input = stdinData || process.argv.slice(2).join('\n');

  if (!input || input === '--help' || input === '-h') {
    console.log(HELP);
    process.exit(0);
  }

  let context: FeatureContext;
  try {
    context = JSON.parse(input) as FeatureContext;
  } catch {
    context = parseFeatureText(input);
  }

  if (!context.featureName || !context.description || !context.steps?.length) {
    console.error(
      'Error: featureName, description, and at least one step are required.\nRun with --help for usage.'
    );
    process.exit(1);
  }

  try {
    const result = await generateTest(context);
    printResult(result);
    if (result.validationStatus === 'FAILED') process.exit(1);
  } catch (err) {
    console.error('Generation failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
