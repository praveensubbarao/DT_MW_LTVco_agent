import { Page, Locator, TestInfo } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface HealResult {
  selector: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface LLMProvider {
  healSelector(description: string, domSnapshot: string): Promise<HealResult>;
}

/**
 * Build the heal prompt for LLM providers
 */
export function buildHealPrompt(description: string, domSnapshot: string): string {
  return `You are a web automation expert. A test is failing because a selector no longer works.
Description: "${description}"
Current page DOM (excerpt):
\`\`\`
${domSnapshot}
\`\`\`

Find a resilient CSS selector that will locate the element described. Prefer:
- data-testid attributes
- aria-label attributes
- role-based selectors
- Avoid nth-child and positional selectors unless necessary

Respond ONLY with valid JSON (no markdown):
{
  "selector": "your-css-selector",
  "confidence": "high|medium|low",
  "reasoning": "brief explanation"
}`;
}

/**
 * Parse LLM response into HealResult
 */
export function parseHealResult(raw: string): HealResult {
  // Strip markdown if present
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(cleaned);
  return {
    selector: parsed.selector,
    confidence: parsed.confidence || 'medium',
    reasoning: parsed.reasoning || '',
  };
}

/**
 * Create LLM provider based on environment
 */
export function createLLMProvider(): LLMProvider | null {
  const provider = process.env.LLM_PROVIDER || '';

  if (provider === 'ollama') {
    const { OllamaProvider } = require('./providers/ollamaProvider');
    return new OllamaProvider();
  }

  if (provider === 'openai') {
    const { OpenAIProvider } = require('./providers/openAIProvider');
    return new OpenAIProvider();
  }

  if (provider === 'claude') {
    const { ClaudeProvider } = require('./providers/claudeProvider');
    return new ClaudeProvider();
  }

  return null;
}

let providerInstance: LLMProvider | null | undefined;

export function getDefaultProvider(): LLMProvider | null {
  if (providerInstance === undefined) {
    providerInstance = createLLMProvider();
  }
  return providerInstance || null;
}

/**
 * Append healing attempt to heal-log.json
 */
export function logHealAttempt(testName: string, description: string, result: HealResult, success: boolean): void {
  const logDir = path.join(process.cwd(), 'self-heal-report');
  const logFile = path.join(logDir, 'heal-log.json');

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  let log: Array<any> = [];
  if (fs.existsSync(logFile)) {
    const content = fs.readFileSync(logFile, 'utf-8');
    log = JSON.parse(content);
  }

  log.push({
    timestamp: new Date().toISOString(),
    testName,
    description,
    selector: result.selector,
    confidence: result.confidence,
    reasoning: result.reasoning,
    success,
  });

  fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
}
