import type { AiProvider } from './ai-provider.js';
import { streamText } from './ai-provider.js';

export class LocalAiProvider implements AiProvider {
  public readonly id = 'local' as const;

  public async complete(input: Parameters<AiProvider['complete']>[0]) {
    const latest = [...input.messages].reverse().find((message) => message.role === 'user');
    const references = input.references.length
      ? `\n\nReferenced context: ${input.references.map((reference) => `${reference.type}:${reference.label}`).join(', ')}`
      : '';
    const content = this.respond(latest?.content ?? 'Help me plan the work') + references;
    return { content, provider: this.id };
  }

  public async *stream(input: Parameters<AiProvider['stream']>[0]) {
    const result = await this.complete(input);
    yield* streamText(result.content);
  }

  private respond(message: string): string {
    const normalized = message.toLowerCase();
    if (normalized.includes('task')) {
      return [
        'Here is a practical task plan:',
        '',
        '1. Clarify the outcome and acceptance criteria.',
        '2. Split the work into implementation, review, and verification tasks.',
        '3. Assign an owner and due date to each task.',
        '4. Keep risky or blocked work visible on the board.',
      ].join('\n');
    }
    if (normalized.includes('summar')) {
      return 'Summary: the current work should be reviewed by scope, blockers, ownership, and upcoming due dates. Focus first on overdue or high-priority items.';
    }
    if (normalized.includes('release')) {
      return 'Release notes draft:\n\n- Added product improvements.\n- Fixed workflow issues.\n- Improved collaboration and reporting visibility.';
    }
    return 'I can help generate tasks, summarize work, suggest priorities, create checklists, search tasks, or draft release notes. Share the outcome you want and I will turn it into actionable project work.';
  }
}
