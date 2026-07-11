import type { AiProvider, AiProviderMessage } from './ai-provider.js';
import { streamText } from './ai-provider.js';

abstract class JsonHttpProvider implements AiProvider {
  public abstract readonly id: 'openai' | 'anthropic' | 'gemini';
  public abstract complete(
    input: Parameters<AiProvider['complete']>[0],
  ): ReturnType<AiProvider['complete']>;

  protected constructor(
    protected readonly apiKey: string | undefined,
    protected readonly model: string,
  ) {}

  public async *stream(input: Parameters<AiProvider['stream']>[0]) {
    const result = await this.complete(input);
    yield* streamText(result.content);
  }

  protected requireKey(): string {
    if (!this.apiKey)
      throw new Error(`${this.id} provider is selected but no API key is configured`);
    return this.apiKey;
  }

  protected systemAndUser(messages: AiProviderMessage[]): { system: string; user: string } {
    const system = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n');
    const user = messages
      .filter((message) => message.role !== 'system')
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');
    return { system, user };
  }
}

export class OpenAiProvider extends JsonHttpProvider {
  public readonly id = 'openai' as const;

  public constructor(apiKey: string | undefined, model: string) {
    super(apiKey, model);
  }

  public async complete(input: Parameters<AiProvider['complete']>[0]) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.requireKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: input.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        temperature: 0.2,
      }),
    });
    const body = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };
    if (!response.ok) throw new Error(body.error?.message ?? 'OpenAI request failed');
    return { content: body.choices?.[0]?.message?.content ?? '', provider: this.id };
  }
}

export class AnthropicProvider extends JsonHttpProvider {
  public readonly id = 'anthropic' as const;

  public constructor(apiKey: string | undefined, model: string) {
    super(apiKey, model);
  }

  public async complete(input: Parameters<AiProvider['complete']>[0]) {
    const { system, user } = this.systemAndUser(input.messages);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.requireKey(),
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        system,
        max_tokens: 1200,
        messages: [{ role: 'user', content: user }],
      }),
    });
    const body = (await response.json()) as {
      content?: { text?: string }[];
      error?: { message?: string };
    };
    if (!response.ok) throw new Error(body.error?.message ?? 'Anthropic request failed');
    return { content: body.content?.[0]?.text ?? '', provider: this.id };
  }
}

export class GeminiProvider extends JsonHttpProvider {
  public readonly id = 'gemini' as const;

  public constructor(apiKey: string | undefined, model: string) {
    super(apiKey, model);
  }

  public async complete(input: Parameters<AiProvider['complete']>[0]) {
    const { system, user } = this.systemAndUser(input.messages);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.requireKey()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
        }),
      },
    );
    const body = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      error?: { message?: string };
    };
    if (!response.ok) throw new Error(body.error?.message ?? 'Gemini request failed');
    return {
      content: body.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
      provider: this.id,
    };
  }
}
