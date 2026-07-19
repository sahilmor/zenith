import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--app-border)] bg-[var(--app-panel-soft)] p-8 text-center text-[var(--app-text)] shadow-sm">
      {icon}
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[var(--app-muted)]">{description}</p>
    </div>
  );
}
