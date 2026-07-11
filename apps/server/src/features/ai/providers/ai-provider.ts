import type { AiMessageRole, AiProviderId, AiReference } from '@pm/types';

export interface AiProviderMessage {
  readonly role: AiMessageRole;
  readonly content: string;
}

export interface AiCompletionInput {
  readonly messages: AiProviderMessage[];
  readonly references: AiReference[];
}

export interface AiCompletionResult {
  readonly content: string;
  readonly provider: AiProviderId;
}

export interface AiProvider {
  readonly id: AiProviderId;
  complete(input: AiCompletionInput): Promise<AiCompletionResult>;
  stream(input: AiCompletionInput): AsyncGenerator<string>;
}

export async function* streamText(text: string): AsyncGenerator<string> {
  const words = text.split(/(\s+)/);
  for (const word of words) {
    if (word.length > 0) yield word;
  }
}
