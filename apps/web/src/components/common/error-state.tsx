import { AlertTriangle } from 'lucide-react';

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again.',
}: Readonly<{ title?: string; description?: string }>) {
  return (
    <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
      <AlertTriangle className="size-5" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-red-200/80">{description}</p>
    </div>
  );
}
