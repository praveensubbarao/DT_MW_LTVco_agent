import { LLMProvider, HealResult, buildHealPrompt, parseHealResult } from '@/utils/selfHeal/llmProvider';
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.client = new Anthropic({ apiKey });
    this.model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
  }

  async healSelector(description: string, domSnapshot: string): Promise<HealResult> {
    const prompt = buildHealPrompt(description, domSnapshot);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    return parseHealResult(content.text);
  }
}
