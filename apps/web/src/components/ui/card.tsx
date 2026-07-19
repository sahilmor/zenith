import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] shadow-xl shadow-black/10',
        className,
      )}
      {...props}
    />
  );
}
