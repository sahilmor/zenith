import { env } from '../../../config/env.js';
import type { AiProvider } from './ai-provider.js';
import { AnthropicProvider, GeminiProvider, OpenAiProvider } from './http-providers.js';
import { LocalAiProvider } from './local.provider.js';

export class AiProviderRegistry {
  public getProvider(): AiProvider {
    if (env.AI_PROVIDER === 'openai') {
      return new OpenAiProvider(env.OPENAI_API_KEY, env.AI_MODEL);
    }
    if (env.AI_PROVIDER === 'anthropic') {
      return new AnthropicProvider(env.ANTHROPIC_API_KEY, env.AI_MODEL);
    }
    if (env.AI_PROVIDER === 'gemini') {
      return new GeminiProvider(env.GEMINI_API_KEY, env.AI_MODEL);
    }
    return new LocalAiProvider();
  }
}
