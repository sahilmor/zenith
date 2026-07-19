import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Loader({ className }: Readonly<{ className?: string }>) {
  return <Loader2 className={cn('size-5 animate-spin text-[var(--app-accent)]', className)} />;
}

export function PageLoader() {
  return (
    <main className="app-surface grid min-h-screen place-items-center">
      <Loader className="size-8" />
    </main>
  );
}
