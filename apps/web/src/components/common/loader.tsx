import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Loader({ className }: Readonly<{ className?: string }>) {
  return <Loader2 className={cn('size-5 animate-spin text-slate-400', className)} />;
}

export function PageLoader() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950">
      <Loader className="size-8" />
    </main>
  );
}
