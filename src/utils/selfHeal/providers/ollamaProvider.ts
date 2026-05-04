import { LLMProvider, HealResult, buildHealPrompt, parseHealResult } from '@/utils/selfHeal/llmProvider';

export class OllamaProvider implements LLMProvider {
  private baseURL: string;
  private user: string;
  private apiKey: string;
  private model: string;

  constructor() {
    this.baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.user = process.env.OLLAMA_USER || '';
    this.apiKey = process.env.OLLAMA_API_KEY || '';
    this.model = process.env.OLLAMA_MODEL || 'llama3';
  }

  async healSelector(description: string, domSnapshot: string): Promise<HealResult> {
    const prompt = buildHealPrompt(description, domSnapshot);

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.user && { 'X-Ollama-User': this.user }),
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.message?.content || '';
    return parseHealResult(content);
  }
}
