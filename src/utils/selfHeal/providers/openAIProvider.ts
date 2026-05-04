import { LLMProvider, HealResult, buildHealPrompt, parseHealResult } from '@/utils/selfHeal/llmProvider';
import OpenAI from 'openai';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
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
      throw new Error('Unexpected response type from OpenAI');
    }

    return parseHealResult(content.text);
  }
}
