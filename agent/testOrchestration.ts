#!/usr/bin/env tsx
/**
 * testOrchestration — AI-powered Playwright test generator (agentic loop)
 *
 * Usage:
 *   echo "<feature context>" | npm run generate:test
 *   npm run generate:test < feature.txt
 *   cat feature.json | npm run generate:test
 *
 * The agent writes the spec, runs tests, reads failures, and self-corrects
 * until all tests pass or MAX_ITERATIONS is reached.
 */
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
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
  filePaths: string[];
  testCount: number;
  deviceCoverage: string[];
  validationStatus: 'PASSED' | 'WARNINGS' | 'FAILED';
  iterations: number;
  warnings: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_DEVICES = ['desktop-chrome', 'tablet-chrome', 'mobile-chrome', 'mobile-small'];
const VALID_DEVICES = new Set(DEFAULT_DEVICES);
const VALID_STACKS = new Set<string>(['dev', 'stg', 'prod']);
const MAX_ITERATIONS = 10;

// ─── Tools ────────────────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'write_file',
    description:
      'Write content to a file, creating parent directories as needed. Use this to write the Playwright spec file — never output code in prose.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description:
            'File path relative to project root (e.g. src/tests/my-feature/my-feature.spec.ts)',
        },
        content: { type: 'string', description: 'Full file content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'run_tests',
    description:
      'Run Playwright tests and return the full output including pass/fail results. Use after writing the spec to verify it.',
    input_schema: {
      type: 'object' as const,
      properties: {
        grep: {
          type: 'string',
          description: 'Optional test name filter (--grep value)',
        },
        project: {
          type: 'string',
          description: 'Device profile to run against (default: desktop-chrome)',
          enum: ['desktop-chrome', 'tablet-chrome', 'mobile-chrome', 'mobile-small'],
        },
      },
    },
  },
  {
    name: 'read_file',
    description: 'Read an existing file — useful for inspecting an existing spec or fixture before generating.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path relative to project root' },
      },
      required: ['path'],
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────

function executeTool(
  name: string,
  input: Record<string, string>,
  writtenFiles: string[]
): string {
  switch (name) {
    case 'write_file': {
      const abs = join(PROJECT_ROOT, input.path);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, input.content, 'utf-8');
      writtenFiles.push(input.path);
      return `Written: ${input.path}`;
    }

    case 'run_tests': {
      const grep = input.grep ? `--grep "${input.grep}"` : '';
      const project = input.project ? `--project=${input.project}` : '--project=desktop-chrome';
      try {
        return execSync(`npx playwright test ${grep} ${project} --reporter=line`, {
          cwd: PROJECT_ROOT,
          timeout: 120_000,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      } catch (err: any) {
        return ((err.stdout as string) ?? '') + ((err.stderr as string) ?? '') || err.message;
      }
    }

    case 'read_file': {
      try {
        return readFileSync(join(PROJECT_ROOT, input.path), 'utf-8');
      } catch {
        return `File not found: ${input.path}`;
      }
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadSystemPrompt(): string {
  const promptPath = join(__dirname, '.test-generation-instructions.md');
  try {
    return readFileSync(promptPath, 'utf-8');
  } catch {
    throw new Error('System prompt not found at agent/.test-generation-instructions.md');
  }
}

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

function countTestsInFile(filePath: string): number {
  try {
    const content = readFileSync(join(PROJECT_ROOT, filePath), 'utf-8');
    return (content.match(/\btest\(/g) ?? []).length;
  } catch {
    return 0;
  }
}

function summarizeInput(input: Record<string, string>): string {
  const [key, val] = Object.entries(input)[0] ?? ['', ''];
  const v = String(val);
  return `${key}: "${v.slice(0, 40)}${v.length > 40 ? '…' : ''}"`;
}

function testsPassed(output: string): boolean {
  return /\d+ passed/.test(output) && !/\d+ failed/.test(output);
}

// ─── Agentic loop ─────────────────────────────────────────────────────────────

async function generateTest(context: FeatureContext): Promise<GenerationResult> {
  const client = new Anthropic();
  const systemPrompt = loadSystemPrompt();
  const deviceCoverage = context.deviceProfiles?.length ? context.deviceProfiles : DEFAULT_DEVICES;

  console.log(`\nGenerating: ${context.featureName}`);
  console.log(`Devices:    ${deviceCoverage.join(', ')}\n`);

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: formatFeatureContext(context) },
  ];

  const writtenFiles: string[] = [];
  const warnings: string[] = [];
  let iterations = 0;
  let lastRunPassed = false;

  while (iterations++ < MAX_ITERATIONS) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8096,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    for (const block of response.content) {
      if (block.type === 'text' && block.text.trim()) {
        process.stdout.write(`\n[agent] ${block.text.trim()}\n`);
      }
    }

    if (response.stop_reason === 'end_turn') break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;

      process.stdout.write(`  [${iterations}] ${block.name}(${summarizeInput(block.input as Record<string, string>)})`);

      const result = executeTool(
        block.name,
        block.input as Record<string, string>,
        writtenFiles
      );

      if (block.name === 'run_tests') {
        lastRunPassed = testsPassed(result);
        const statusLine = result.split('\n').find((l) => /passed|failed/.test(l))?.trim() ?? '';
        process.stdout.write(` → ${lastRunPassed ? '✓' : '✗'} ${statusLine}\n`);
      } else {
        process.stdout.write(` → ${result.split('\n')[0].slice(0, 80)}\n`);
      }

      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  if (iterations > MAX_ITERATIONS) {
    warnings.push(`Reached max iterations (${MAX_ITERATIONS}) without all tests passing`);
  }

  const uniqueFiles = [...new Set(writtenFiles)];
  const testCount = uniqueFiles.reduce((sum, f) => sum + countTestsInFile(f), 0);

  let validationStatus: GenerationResult['validationStatus'];
  if (lastRunPassed) {
    validationStatus = 'PASSED';
  } else if (uniqueFiles.length > 0) {
    validationStatus = 'WARNINGS';
  } else {
    validationStatus = 'FAILED';
  }

  return { filePaths: uniqueFiles, testCount, deviceCoverage, validationStatus, iterations, warnings };
}

// ─── Output ───────────────────────────────────────────────────────────────────

function printResult(result: GenerationResult): void {
  const icon = { PASSED: '✓', WARNINGS: '⚠', FAILED: '✗' }[result.validationStatus];
  const line = '─'.repeat(56);

  console.log(`\n${line}`);
  result.filePaths.forEach((f) => console.log(` ${icon} ${result.validationStatus}: ${f}`));
  console.log(`   Tests:      ${result.testCount}`);
  console.log(`   Devices:    ${result.deviceCoverage.join(', ')}`);
  console.log(`   Iterations: ${result.iterations}`);

  if (result.warnings.length > 0) {
    console.log('\n  Warnings:');
    result.warnings.forEach((w) => console.log(`    - ${w}`));
  }

  console.log('\n  Run:');
  console.log('    1. npm test --project=desktop-chrome');
  console.log('    2. npm test');
  console.log('    3. npx playwright show-report');
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
      // Selectors are optional
    }
  }

  return ctx as FeatureContext;
}

// ─── Help ─────────────────────────────────────────────────────────────────────

const HELP = `
testOrchestration — AI-powered Playwright test generator (agentic loop)

Usage:
  echo "<feature context>" | npm run generate:test
  npm run generate:test < feature.txt
  cat feature.json | npm run generate:test

The agent will:
  1. Write the Playwright spec file
  2. Run tests automatically (desktop-chrome)
  3. Read failures and self-correct
  4. Repeat until all tests pass or max iterations reached

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
