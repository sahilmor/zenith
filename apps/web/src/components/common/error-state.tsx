import { AlertTriangle } from 'lucide-react';

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again.',
}: Readonly<{ title?: string; description?: string }>) {
  return (
    <div className="rounded-3xl border border-[var(--app-danger)]/20 bg-[var(--app-danger)]/10 p-6 text-[var(--app-danger)]">
      <AlertTriangle className="size-5" />
      <h3 className="mt-3 font-semibold text-[var(--app-text)]">{title}</h3>
      <p className="mt-1 text-sm text-[var(--app-muted)]">{description}</p>
    </div>
  );
}
